const { withTransaction } = require("../../../helpers/transaction.cjs");
const { pool } = require("../../../repositories/db.2.0.0.cjs");

const adjust = async ({
  conn,
  id_produk,
  id_perusahaan,
  jumlah,
  created_by = null,
  updated_by = null,
}) => {
  if (id_perusahaan == null) return;
  await conn.execute(
    `INSERT INTO produkstokperusahaan
       (id_produk, id_perusahaan, stok, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       stok = stok + VALUES(stok),
       updated_by = COALESCE(VALUES(updated_by), updated_by),
       updated_at = CURRENT_TIMESTAMP`,
    [id_produk, id_perusahaan, jumlah, created_by, updated_by],
  );
};

const claimUnclaimedEntry = async ({
  id,
  id_perusahaan,
  updated_by = null,
}) =>
  withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id, id_produk, jumlah, keluar, id_perusahaan
       FROM produkmasuk
       WHERE id = ?
       FOR UPDATE`,
      [id],
    );
    const entry = rows[0];
    if (!entry) {
      const error = new Error("Produk masuk tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }
    if (entry.id_perusahaan != null) {
      const error = new Error("Produk masuk ini sudah diklaim.");
      error.statusCode = 409;
      throw error;
    }

    const [result] = await conn.execute(
      "UPDATE produkmasuk SET id_perusahaan = ? WHERE id = ? AND id_perusahaan IS NULL",
      [id_perusahaan, id],
    );
    if (result.affectedRows !== 1) {
      const error = new Error("Produk masuk ini sudah diklaim.");
      error.statusCode = 409;
      throw error;
    }
    await adjust({
      conn,
      id_produk: entry.id_produk,
      id_perusahaan,
      jumlah: Number(entry.jumlah) - Number(entry.keluar ?? 0),
      updated_by,
    });

    return { message: "Produk masuk berhasil diklaim." };
  });

const recordLoan = async (
  conn,
  {
    id_produkkeluar,
    id_produkmasuk,
    id_produk,
    id_perusahaan_pemberi,
    id_perusahaan_peminjam,
    jumlah,
    id_vendor = null,
    harga,
    tanggal,
    created_by = null,
  },
) => {
  if (
    id_perusahaan_pemberi == null ||
    id_perusahaan_peminjam == null ||
    String(id_perusahaan_pemberi) === String(id_perusahaan_peminjam)
  )
    return;

  const [loanResult] = await conn.execute(
    `INSERT INTO produkpinjaman
     (id_produkkeluar, id_produkmasuk, id_produk, id_perusahaan_pemberi, id_perusahaan_peminjam, jumlah, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id_produkkeluar,
      id_produkmasuk,
      id_produk,
      id_perusahaan_pemberi,
      id_perusahaan_peminjam,
      jumlah,
      created_by,
    ],
  );

  const [stockEntryResult] = await conn.execute(
    `INSERT INTO produkmasuk
     (id_produk, id_vendor, jumlah, harga, terbayar, tanggal, jatuhtempo,
      pinjaman, id_perusahaan, id_produkpinjaman, jenis_transaksi)
     VALUES (?, ?, ?, ?, 0, ?, NULL, 1, ?, ?, 'pinjaman')`,
    [
      id_produk,
      id_vendor,
      jumlah,
      harga,
      tanggal,
      id_perusahaan_peminjam,
      loanResult.insertId,
    ],
  );
  await conn.execute(
    `UPDATE produkpinjaman
     SET id_produkmasuk_peminjam = ?
     WHERE id = ?`,
    [stockEntryResult.insertId, loanResult.insertId],
  );

  return {
    id: loanResult.insertId,
    id_produkmasuk_peminjam: stockEntryResult.insertId,
  };
};

const returnLoan = async ({
  id_produkpinjaman,
  id_perusahaan,
  stockEntries,
  tanggal,
  keterangan = "",
  created_by = null,
}) =>
  withTransaction(pool, async (conn) => {
    const [loanRows] = await conn.execute(
      `SELECT loan.id, loan.id_produk, loan.id_produkmasuk,
              loan.id_perusahaan_pemberi, loan.id_perusahaan_peminjam,
              loan.jumlah, source.id_vendor, source.harga
       FROM produkpinjaman loan
       INNER JOIN produkmasuk source ON source.id = loan.id_produkmasuk
       WHERE loan.id = ? AND loan.id_perusahaan_peminjam = ?
       FOR UPDATE`,
      [id_produkpinjaman, id_perusahaan],
    );
    const loan = loanRows[0];
    if (!loan) throw new Error("Pinjaman tidak ditemukan.");

    const [returnedRows] = await conn.execute(
      `SELECT COALESCE(SUM(jumlah), 0) AS jumlah_dikembalikan
       FROM produkpinjamanpengembalian
       WHERE id_produkpinjaman = ?`,
      [id_produkpinjaman],
    );
    const returned = Number(returnedRows[0]?.jumlah_dikembalikan ?? 0);
    const outstanding = Number(loan.jumlah) - returned;
    const requestedTotal = stockEntries.reduce(
      (total, entry) => total + Number(entry.jumlah),
      0,
    );
    if (requestedTotal > outstanding) {
      throw new Error(
        `Jumlah pengembalian melebihi sisa pinjaman (${outstanding}).`,
      );
    }

    const seenEntryIds = new Set();
    const createdReturns = [];
    for (const entry of stockEntries) {
      const stockEntryId = Number(entry.id_produkmasuk);
      const quantity = Number(entry.jumlah);
      if (
        !Number.isInteger(stockEntryId) ||
        stockEntryId <= 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      )
        throw new Error("Data stok pengembalian tidak valid.");
      if (seenEntryIds.has(stockEntryId))
        throw new Error("Stok masuk yang sama tidak boleh dipilih dua kali.");
      seenEntryIds.add(stockEntryId);

      const [stockRows] = await conn.execute(
        `SELECT id, id_produk, id_vendor, jumlah, keluar, id_perusahaan
         FROM produkmasuk
         WHERE id = ? AND id_perusahaan = ?
         FOR UPDATE`,
        [stockEntryId, id_perusahaan],
      );
      const stock = stockRows[0];
      if (!stock || String(stock.id_produk) !== String(loan.id_produk))
        throw new Error("Produk masuk tidak sesuai dengan pinjaman.");
      const available = Number(stock.jumlah) - Number(stock.keluar ?? 0);
      if (quantity > available) {
        throw new Error(
          `Jumlah pengembalian melebihi sisa stok masuk #${stockEntryId} (${available}).`,
        );
      }

      await conn.execute(
        "UPDATE produkmasuk SET keluar = keluar + ? WHERE id = ?",
        [quantity, stockEntryId],
      );
      const [outflowResult] = await conn.execute(
        `INSERT INTO produkkeluar
         (id_produk, id_produkmasuk, id_perusahaan, created_by, updated_by,
          metodepengeluaran, jenis_transaksi, sn, jumlah, harga, tanggal, keterangan)
         VALUES (?, ?, ?, ?, ?, 'pengembalian', 'pengembalian', 0, ?, ?, ?, ?)`,
        [
          loan.id_produk,
          stockEntryId,
          id_perusahaan,
          created_by,
          created_by,
          quantity,
          loan.harga,
          tanggal,
          keterangan || `Pengembalian pinjaman #${id_produkpinjaman}`,
        ],
      );
      const [receivedEntryResult] = await conn.execute(
        `INSERT INTO produkmasuk
         (id_produk, id_vendor, jumlah, harga, terbayar, tanggal, jatuhtempo,
          pinjaman, id_perusahaan, jenis_transaksi)
         VALUES (?, ?, ?, ?, 0, ?, NULL, 0, ?, 'pengembalian')`,
        [
          loan.id_produk,
          loan.id_vendor,
          quantity,
          loan.harga,
          tanggal,
          loan.id_perusahaan_pemberi,
        ],
      );

      await adjust({
        conn,
        id_produk: loan.id_produk,
        id_perusahaan,
        jumlah: -quantity,
        updated_by: created_by,
      });
      await adjust({
        conn,
        id_produk: loan.id_produk,
        id_perusahaan: loan.id_perusahaan_pemberi,
        jumlah: quantity,
        created_by,
        updated_by: created_by,
      });
      await conn.execute(
        `INSERT INTO produkpinjamanpengembalian
         (id_produkpinjaman, id_produkmasuk_peminjam, id_produkkeluar,
          id_produkmasuk_pemberi, jumlah, tanggal, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id_produkpinjaman,
          stockEntryId,
          outflowResult.insertId,
          receivedEntryResult.insertId,
          quantity,
          tanggal,
          created_by,
        ],
      );

      createdReturns.push({
        id_produkkeluar: outflowResult.insertId,
        id_produkmasuk_pemberi: receivedEntryResult.insertId,
        jumlah: quantity,
      });
    }

    const [finalRows] = await conn.execute(
      `SELECT COALESCE(SUM(jumlah), 0) AS jumlah_dikembalikan
       FROM produkpinjamanpengembalian
       WHERE id_produkpinjaman = ?`,
      [id_produkpinjaman],
    );
    const totalReturned = Number(finalRows[0]?.jumlah_dikembalikan ?? 0);
    await conn.execute(
      `UPDATE produkpinjaman
       SET aktif = ?, updated_by = ?
       WHERE id = ?`,
      [totalReturned < Number(loan.jumlah) ? 1 : 0, created_by, id_produkpinjaman],
    );

    return {
      id_produkpinjaman,
      jumlah_dikembalikan: requestedTotal,
      sisa_pinjaman: Number(loan.jumlah) - totalReturned,
      returns: createdReturns,
    };
  });

const revertReturn = async ({ id_return, id_perusahaan, updated_by = null }) =>
  withTransaction(pool, async (conn) => {
    const [returnRows] = await conn.execute(
      `SELECT returned.id, returned.id_produkpinjaman,
              returned.id_produkmasuk_peminjam, returned.id_produkkeluar,
              returned.id_produkmasuk_pemberi, returned.jumlah,
              loan.id_produk, loan.id_perusahaan_pemberi,
              loan.id_perusahaan_peminjam, loan.jumlah AS jumlah_pinjaman
       FROM produkpinjamanpengembalian returned
       INNER JOIN produkpinjaman loan
         ON loan.id = returned.id_produkpinjaman
       WHERE returned.id = ? AND loan.id_perusahaan_peminjam = ?
       FOR UPDATE`,
      [id_return, id_perusahaan],
    );
    const returned = returnRows[0];
    if (!returned) throw new Error("Data pengembalian tidak ditemukan.");

    const [outflowRows] = await conn.execute(
      `SELECT id, id_produk, id_produkmasuk, id_perusahaan, jumlah,
              jenis_transaksi
       FROM produkkeluar
       WHERE id = ?
       FOR UPDATE`,
      [returned.id_produkkeluar],
    );
    const outflow = outflowRows[0];
    if (
      !outflow ||
      outflow.jenis_transaksi !== "pengembalian" ||
      String(outflow.id_produkmasuk) !==
        String(returned.id_produkmasuk_peminjam) ||
      String(outflow.id_perusahaan) !== String(id_perusahaan) ||
      Number(outflow.jumlah) !== Number(returned.jumlah)
    )
      throw new Error("Data transaksi pengembalian tidak sesuai.");

    const [stockRows] = await conn.execute(
      `SELECT id, id_produk, jumlah, keluar, id_perusahaan, jenis_transaksi
       FROM produkmasuk
       WHERE id = ?
       FOR UPDATE`,
      [returned.id_produkmasuk_pemberi],
    );
    const receivedStock = stockRows[0];
    if (!receivedStock)
      throw new Error("Stok masuk hasil pengembalian tidak ditemukan.");
    if (Number(receivedStock.keluar ?? 0) !== 0)
      throw new Error(
        "Stok pengembalian sudah digunakan dan tidak dapat dibatalkan.",
      );
    if (
      String(receivedStock.id_produk) !== String(returned.id_produk) ||
      String(receivedStock.id_perusahaan) !==
        String(returned.id_perusahaan_pemberi) ||
      receivedStock.jenis_transaksi !== "pengembalian" ||
      Number(receivedStock.jumlah) !== Number(returned.jumlah)
    )
      throw new Error("Data stok pengembalian tidak sesuai dengan pinjaman.");

    const [borrowedRows] = await conn.execute(
      `SELECT id, id_produk, keluar, id_perusahaan
       FROM produkmasuk
       WHERE id = ?
       FOR UPDATE`,
      [returned.id_produkmasuk_peminjam],
    );
    const borrowedStock = borrowedRows[0];
    if (
      !borrowedStock ||
      String(borrowedStock.id_produk) !== String(returned.id_produk) ||
      String(borrowedStock.id_perusahaan) !== String(id_perusahaan) ||
      Number(borrowedStock.keluar ?? 0) < Number(returned.jumlah)
    )
      throw new Error("Stok pinjaman tidak dapat dikembalikan ke saldo.");

    await conn.execute(
      `UPDATE produkmasuk
       SET keluar = keluar - ?
       WHERE id = ?`,
      [returned.jumlah, returned.id_produkmasuk_peminjam],
    );
    await adjust({
      conn,
      id_produk: returned.id_produk,
      id_perusahaan: returned.id_perusahaan_peminjam,
      jumlah: Number(returned.jumlah),
      updated_by,
    });
    await adjust({
      conn,
      id_produk: returned.id_produk,
      id_perusahaan: returned.id_perusahaan_pemberi,
      jumlah: -Number(returned.jumlah),
      updated_by,
    });
    await conn.execute(
      "DELETE FROM produkpinjamanpengembalian WHERE id = ?",
      [id_return],
    );
    await conn.execute(
      "DELETE FROM produkkeluar WHERE id = ? AND jenis_transaksi = 'pengembalian'",
      [returned.id_produkkeluar],
    );
    await conn.execute(
      "DELETE FROM produkmasuk WHERE id = ?",
      [returned.id_produkmasuk_pemberi],
    );

    const [balanceRows] = await conn.execute(
      `SELECT COALESCE(SUM(jumlah), 0) AS jumlah_dikembalikan
       FROM produkpinjamanpengembalian
       WHERE id_produkpinjaman = ?`,
      [returned.id_produkpinjaman],
    );
    const totalReturned = Number(balanceRows[0]?.jumlah_dikembalikan ?? 0);
    await conn.execute(
      `UPDATE produkpinjaman
       SET aktif = ?, updated_by = ?
       WHERE id = ?`,
      [
        totalReturned < Number(returned.jumlah_pinjaman) ? 1 : 0,
        updated_by,
        returned.id_produkpinjaman,
      ],
    );

    return {
      id_produkpinjaman: returned.id_produkpinjaman,
      jumlah_dibatalkan: Number(returned.jumlah),
      sisa_pinjaman:
        Number(returned.jumlah_pinjaman) - totalReturned,
    };
  });

module.exports = {
  adjust,
  claimUnclaimedEntry,
  recordLoan,
  returnLoan,
  revertReturn,
};
