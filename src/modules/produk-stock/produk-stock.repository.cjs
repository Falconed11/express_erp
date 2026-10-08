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
    created_by = null,
  },
) => {
  if (
    id_perusahaan_pemberi == null ||
    id_perusahaan_peminjam == null ||
    String(id_perusahaan_pemberi) === String(id_perusahaan_peminjam)
  )
    return;

  await conn.execute(
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
};

module.exports = { adjust, claimUnclaimedEntry, recordLoan };
