// produkkeluar.service.js
const {
  withTransaction,
  assertTransaction,
} = require("../helpers/transaction.cjs");
const { pool } = require("./db.2.0.0.cjs");
const {
  adjust: adjustCompanyStock,
  recordLoan: recordCompanyLoan,
} = require("../src/modules/produk-stock/produk-stock.repository.cjs");
const {
  createLoanJournals,
} = require("../src/modules/produk-stock/produk-stock-journal.cjs");
const { createPurchaseJournal } = require("./produkmasuk-jurnal.cjs");

const OUTPUT_TABLE = "produkkeluar";

const getCompanyForOutput = async (
  conn,
  { id_jurnal, id_proyek, idproyek, id_perusahaan },
) => {
  if (id_jurnal) {
    const [rows] = await conn.execute(
      "SELECT id_perusahaan FROM jurnal WHERE id = ?",
      [id_jurnal],
    );
    if (rows[0]?.id_perusahaan != null) return rows[0].id_perusahaan;
  }
  if (id_proyek) {
    const [rows] = await conn.execute(
      "SELECT id_perusahaan FROM proyek WHERE id = ?",
      [id_proyek],
    );
    if (rows[0]?.id_perusahaan != null) return rows[0].id_perusahaan;
  }
  if (idproyek) {
    const [rows] = await conn.execute(
      "SELECT id_perusahaan FROM proyek WHERE id_second = ?",
      [idproyek],
    );
    if (rows[0]?.id_perusahaan != null) return rows[0].id_perusahaan;
  }
  return id_perusahaan ?? null;
};

const createProjectStockUsageJournal = async (
  conn,
  {
    id_proyek,
    id_perusahaan,
    tanggal,
    keterangan,
    amount,
    created_by,
    updated_by,
  },
) => {
  const [[formRows], [hppRows], [inventoryRows]] = await Promise.all([
    conn.execute(
      "SELECT id FROM jurnal_form WHERE system_key = 'HPP' AND aktif = 1 LIMIT 1",
    ),
    conn.execute(
      `SELECT c.id
       FROM coa_type ct
       INNER JOIN coa_subtype cs ON cs.id_coa_type = ct.id
       INNER JOIN coa c ON c.id_coa_subtype = cs.id
       WHERE ct.nama = 'HPP' AND ct.aktif = 1
         AND cs.nama = 'HPP' AND cs.aktif = 1
         AND c.nama = 'HPP' AND c.aktif = 1
       LIMIT 1`,
    ),
    conn.execute(
      `SELECT c.id
       FROM coa_type ct
       INNER JOIN coa_subtype cs ON cs.id_coa_type = ct.id
       INNER JOIN coa c ON c.id_coa_subtype = cs.id
       WHERE ct.nama = 'Aktiva Lancar' AND ct.aktif = 1
         AND cs.nama = 'Persediaan' AND cs.aktif = 1
         AND c.nama = 'Persediaan' AND c.aktif = 1
       LIMIT 1`,
    ),
  ]);

  const journalForm = formRows[0];
  const hppCoa = hppRows[0];
  const inventoryCoa = inventoryRows[0];

  if (!journalForm) throw new Error("Jurnal form HPP belum tersedia.");
  if (!hppCoa) throw new Error("COA HPP belum tersedia.");
  if (!inventoryCoa) throw new Error("COA Persediaan belum tersedia.");

  const [journalResult] = await conn.execute(
    `INSERT INTO jurnal
      (id_jurnal_form, id_perusahaan, id_proyek, tanggal, keterangan, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      journalForm.id,
      id_perusahaan ?? null,
      id_proyek ?? null,
      tanggal,
      keterangan || "Pemakaian stok proyek",
      created_by ?? null,
      updated_by ?? created_by ?? null,
    ],
  );

  const journalId = journalResult.insertId;
  await conn.execute(
    `INSERT INTO transaksi
      (id_jurnal, id_coa, tipe, amount, keterangan, created_by, updated_by)
     VALUES (?, ?, 1, ?, 'HPP', ?, ?),
            (?, ?, 0, ?, 'Persediaan', ?, ?)`,
    [
      journalId,
      hppCoa.id,
      Number(amount),
      created_by ?? null,
      updated_by ?? created_by ?? null,
      journalId,
      inventoryCoa.id,
      Number(amount),
      created_by ?? null,
      updated_by ?? created_by ?? null,
    ],
  );

  return journalId;
};

const createIntercompanyLoan = async ({
  conn,
  id_produk,
  sourceEntry,
  id_perusahaan_peminjam,
  id_proyek,
  jumlah,
  tanggal,
  keterangan,
  created_by,
  updated_by,
}) => {
  if (
    sourceEntry.id_perusahaan == null ||
    id_perusahaan_peminjam == null ||
    String(sourceEntry.id_perusahaan) === String(id_perusahaan_peminjam)
  )
    return null;

  await conn.execute(
    "UPDATE produkmasuk SET keluar = keluar + ? WHERE id = ?",
    [jumlah, sourceEntry.id],
  );
  await adjustCompanyStock({
    conn,
    id_produk,
    id_perusahaan: sourceEntry.id_perusahaan,
    jumlah: -jumlah,
    updated_by,
  });
  await adjustCompanyStock({
    conn,
    id_produk,
    id_perusahaan: id_perusahaan_peminjam,
    jumlah,
    created_by,
    updated_by,
  });

  const [outflowResult] = await conn.execute(
    `INSERT INTO ${OUTPUT_TABLE}
     (id_produk, id_produkmasuk, id_proyek, id_perusahaan,
      created_by, updated_by, metodepengeluaran, jenis_transaksi, sn,
      jumlah, harga, tanggal, keterangan)
     VALUES (?, ?, ?, ?, ?, ?, 'pinjaman', 'pinjaman', 0, ?, ?, ?, ?)`,
    [
      id_produk,
      sourceEntry.id,
      id_proyek || null,
      id_perusahaan_peminjam,
      created_by,
      updated_by,
      jumlah,
      sourceEntry.harga,
      tanggal,
      keterangan,
    ],
  );
  const loan = await recordCompanyLoan(conn, {
    id_produkkeluar: outflowResult.insertId,
    id_produkmasuk: sourceEntry.id,
    id_produk,
    id_perusahaan_pemberi: sourceEntry.id_perusahaan,
    id_perusahaan_peminjam,
    jumlah,
    id_vendor: sourceEntry.id_vendor,
    harga: sourceEntry.harga,
    tanggal,
    created_by,
  });

  await createLoanJournals(conn, {
    id_produkpinjaman: loan.id,
    id_perusahaan_pemberi: sourceEntry.id_perusahaan,
    id_perusahaan_peminjam,
    jumlah,
    harga: sourceEntry.harga,
    tanggal,
    created_by,
  });

  return loan.id_produkmasuk_peminjam;
};

const createMarkedLoanPurchaseEntry = async ({
  conn,
  sourceEntry,
  id_produk,
  id_perusahaan_peminjam,
  jumlah,
  tanggal,
  created_by,
  updated_by,
}) => {
  const amount = Number(sourceEntry.harga || 0) * Number(jumlah);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Harga stok pinjaman harus lebih besar dari 0.");
  if (!id_perusahaan_peminjam)
    throw new Error("Perusahaan pemakai stok pinjaman belum tersedia.");

  const [debtRows] = await conn.execute(
    `SELECT c.id
     FROM coa c
     INNER JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
     INNER JOIN coa_type ct ON ct.id = cs.id_coa_type
     WHERE c.nama = 'Hutang' AND c.aktif = 1
       AND cs.nama = 'Hutang' AND cs.aktif = 1
       AND ct.nama = 'Kewajiban Lancar' AND ct.aktif = 1
       AND EXISTS (
         SELECT 1
         FROM laporan l
         INNER JOIN laporan_relation lr
           ON lr.id_parent = l.id AND lr.id_child IS NULL AND lr.aktif = 1
         LEFT JOIN coa_type mapped_type ON mapped_type.id = lr.id_coa_type
         WHERE l.nama = 'Metode Bayar' AND l.aktif = 1
           AND (
             lr.id_coa = c.id
             OR lr.id_coa_subtype = c.id_coa_subtype
             OR mapped_type.id = cs.id_coa_type
           )
       )
     LIMIT 1`,
  );
  const debtCoaId = debtRows[0]?.id;
  if (!debtCoaId)
    throw new Error("COA Hutang default belum tersedia di Metode Bayar.");

  await conn.execute(
    "UPDATE produkmasuk SET keluar = keluar + ? WHERE id = ?",
    [jumlah, sourceEntry.id],
  );
  if (
    sourceEntry.id_perusahaan != null &&
    String(sourceEntry.id_perusahaan) !== String(id_perusahaan_peminjam)
  ) {
    await adjustCompanyStock({
      conn,
      id_produk,
      id_perusahaan: sourceEntry.id_perusahaan,
      jumlah: -jumlah,
      updated_by,
    });
    await adjustCompanyStock({
      conn,
      id_produk,
      id_perusahaan: id_perusahaan_peminjam,
      jumlah,
      created_by,
      updated_by,
    });
  }

  const [entryResult] = await conn.execute(
    `INSERT INTO produkmasuk
      (id_produk, id_vendor, jumlah, harga, terbayar, tanggal, jatuhtempo,
       pinjaman, id_perusahaan, created_by, updated_by, jenis_transaksi)
     VALUES (?, ?, ?, ?, 0, ?, NULL, 0, ?, ?, ?, 'pembelian')`,
    [
      id_produk,
      sourceEntry.id_vendor,
      jumlah,
      sourceEntry.harga,
      tanggal,
      id_perusahaan_peminjam,
      created_by,
      updated_by ?? created_by,
    ],
  );

  await createPurchaseJournal(conn, {
    id_produkmasuk: entryResult.insertId,
    id_perusahaan: id_perusahaan_peminjam,
    id_coa_kredit: debtCoaId,
    tanggal,
    amount,
    lunas: false,
    created_by,
  });

  return entryResult.insertId;
};

async function list({
  id_produk,
  id_jurnal,
  id_perusahaan,
  id_perusahaan_produkmasuk,
  filterText,
}) {
  const conn = await pool.getConnection();
  try {
    const hasIdProduk = Boolean(id_produk);
    const normalizedFilterText =
      typeof filterText === "string" ? filterText.trim() : "";
    const words = normalizedFilterText
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);
    const hasFilterText = words.length > 0;

    let sql = `
      SELECT p.nama AS produk,
             p.id_kustom AS pid,
             p.nama,
             p.tipe AS tipe,
             p.stok,
             p.satuan,
             pm.harga AS hargaprodukmasuk,
             pm.id_perusahaan AS id_perusahaan_produkmasuk,
             m.nama AS merek,
             v.nama AS vendor,
             pk.*,
             return_record.id AS id_produkpinjamanpengembalian,
             pr.id AS id_proyek,
             pr.nama AS nama_proyek,
             i.nama AS nama_instansi
      FROM ${OUTPUT_TABLE} pk
      LEFT JOIN produk p           ON p.id = pk.id_produk
      LEFT JOIN produkmasuk pm     ON pm.id = pk.id_produkmasuk
      LEFT JOIN produkpinjamanpengembalian return_record
                                    ON return_record.id_produkkeluar = pk.id
      LEFT JOIN merek m            ON m.id = p.id_merek
      LEFT JOIN vendor v           ON v.id = p.id_vendor
      LEFT JOIN proyek pr          ON pr.id = pk.id_proyek
      LEFT JOIN instansi i         ON i.id = pr.id_instansi
      WHERE 1 = 1
      ${hasIdProduk ? "AND pk.id_produk = ?" : ""}
      ${id_jurnal ? "AND pk.id_jurnal = ?" : ""}
      ${id_perusahaan ? "AND pk.id_perusahaan = ?" : ""}
      ${id_perusahaan_produkmasuk ? "AND pm.id_perusahaan = ?" : ""}
      ${hasFilterText ? words.map(() => "AND LOWER(CONCAT_WS(' ', COALESCE(p.id_kustom, ''), COALESCE(p.nama, ''), COALESCE(p.tipe, ''), COALESCE(m.nama, ''), COALESCE(v.nama, ''), COALESCE(pr.nama, ''), COALESCE(i.nama, ''), COALESCE(pk.keterangan, ''))) LIKE ?").join(" ") : ""}
      order by pk.tanggal desc, pk.id desc
    `;
    const params = [];
    if (hasIdProduk) params.push(id_produk);
    if (id_jurnal) params.push(id_jurnal);
    if (id_perusahaan) params.push(id_perusahaan);
    if (id_perusahaan_produkmasuk) params.push(id_perusahaan_produkmasuk);
    if (hasFilterText) {
      for (const word of words) {
        params.push(`%${word.toLowerCase()}%`);
      }
    }
    const [rows] = await conn.execute(sql, params);
    return rows;
  } finally {
    conn.release();
  }
}
async function create(data) {
  return await withTransaction(pool, async (conn) => {
    return await _createInTransaction({ ...data, conn });
  });
}
async function createInTransaction(data, conn) {
  return await _createInTransaction({ ...data, conn });
}
async function update(params) {
  return await withTransaction(pool, async (conn) => {
    const {
      id,
      sn = null,
      id_produkmasuk,
      id_produk,
      id_jurnal,
      oldJumlah,
      harga = 0,
      metodepengeluaran,
      tanggal,
      ...rest
    } = params;
    const [existingRows] = await conn.execute(
      `SELECT jenis_transaksi
       FROM ${OUTPUT_TABLE}
       WHERE id = ?
       FOR UPDATE`,
      [id],
    );
    if (
      existingRows[0]?.jenis_transaksi === "pinjaman" ||
      existingRows[0]?.jenis_transaksi === "pengembalian"
    ) {
      throw new Error(
        "Transaksi pinjaman/pengembalian tidak dapat diubah langsung.",
      );
    }

    if (metodepengeluaran !== "proyek") {
      // Simple update case
      const sql = `UPDATE ${OUTPUT_TABLE}
                   SET sn = ?, harga = ?, metodepengeluaran = ?, tanggal = ?
                   WHERE id = ?`;
      const values = [sn, harga, metodepengeluaran, tanggal, id];
      await conn.execute(sql, values);
      return { updated: true };
    } else {
      // Replace -> delete old, then create new
      await _deleteInTransaction({
        id,
        id_produkmasuk,
        id_produk,
        metodepengeluaran,
        jumlah: oldJumlah,
        conn,
      });
      const result = await _createInTransaction({
        ...rest,
        id_produk,
        sn,
        metodepengeluaran,
        harga,
        tanggal,
        isSelected: true,
        conn,
      });
      return result;
    }
  });
}
async function destroy(params) {
  return await withTransaction(pool, async (conn) => {
    if (params.id != null) {
      return _deleteInTransaction({ ...params, conn });
    }

    if (params.id_jurnal) {
      const [rows] = await conn.execute(
        `SELECT id, jumlah, id_produkmasuk, id_produk, metodepengeluaran
         FROM ${OUTPUT_TABLE}
         WHERE id_jurnal = ?
         FOR UPDATE`,
        [params.id_jurnal],
      );

      for (const row of rows) {
        await _deleteInTransaction({ ...row, conn });
      }

      await conn.execute("DELETE FROM transaksi WHERE id_jurnal = ?", [
        params.id_jurnal,
      ]);
      await conn.execute("DELETE FROM jurnal WHERE id = ?", [params.id_jurnal]);
      return { success: true, deleted: rows.length };
    }
    return await _deleteInTransaction({ ...params, conn });
  });
}

async function destroyByJurnalInTransaction(id_jurnal, conn) {
  const [rows] = await conn.execute(
    `SELECT id, jumlah, id_produkmasuk, id_produk, metodepengeluaran
     FROM ${OUTPUT_TABLE}
     WHERE id_jurnal = ?
     FOR UPDATE`,
    [id_jurnal],
  );

  for (const row of rows) {
    await _deleteInTransaction({ ...row, conn });
  }

  return { success: true, deleted: rows.length };
}

async function destroyInTransaction(id, conn) {
  assertTransaction(conn, "destroyInTransaction");
  const [rows] = await conn.execute(
    `SELECT id, jumlah, id_produkmasuk, id_produk, metodepengeluaran
     FROM ${OUTPUT_TABLE}
     WHERE id = ?
     FOR UPDATE`,
    [id],
  );
  if (rows.length === 0) throw new Error("Produk keluar tidak ditemukan.");

  return _deleteInTransaction({ ...rows[0], conn });
}

// Internal helper: create inside transaction
async function _createInTransaction({
  id_produk,
  id_jurnal = null,
  created_by = null,
  updated_by = null,
  sn,
  metodepengeluaran,
  serialnumbers,
  produkmasuk = [],
  jumlah = 0,
  harga = 0,
  tanggal,
  keterangan = "",
  isSelected,
  idproyek,
  id_proyek,
  id_perusahaan,
  karyawan,
  id_karyawan = null,
  idproduk,
  status,
  conn,
}) {
  assertTransaction(conn, "_createInTransaction");
  if (
    produkmasuk.length === 0 &&
    (!sn || sn === 0) &&
    (!jumlah || jumlah === 0)
  )
    throw new Error("Jumlah tidak boleh 0!");
  let [produkRows] = await conn.execute(
    `SELECT stok, satuan FROM produk WHERE id = ? FOR UPDATE`,
    [id_produk],
  );
  if (produkRows.length === 0) throw new Error("Produk tidak ditemukan");
  const produk = produkRows[0];
  const consumingCompanyId = await getCompanyForOutput(conn, {
    id_jurnal,
    id_proyek,
    idproyek,
    id_perusahaan,
  });
  if (jumlah > produk.stok)
    throw new Error(
      `Stok tidak mencukupi. Maks. ${produk.stok} ${produk.satuan}.`,
    );
  const generatedOutputIds = [];
  let generatedJournalAmount = 0;

  if (produkmasuk.length > 0) {
    const totalJumlah = produkmasuk.reduce(
      (total, item) => total + (+item.jumlah || 0),
      0,
    );
    if (totalJumlah > produk.stok)
      throw new Error(
        `Stok tidak mencukupi. Maks. ${produk.stok} ${produk.satuan}.`,
      );

    for (const allocation of produkmasuk) {
      const requested = +allocation.jumlah || 0;
      if (requested <= 0) throw new Error("Jumlah produk tidak boleh 0!");
      const [pmRows] = await conn.execute(
        `SELECT id, id_produk, id_vendor, jumlah, keluar, harga, id_perusahaan,
          pinjaman, id_produkpinjaman
         FROM produkmasuk WHERE id = ? FOR UPDATE`,
        [allocation.id_produkmasuk],
      );
      if (pmRows.length === 0) throw new Error("Produk masuk tidak ditemukan");
      const pm = pmRows[0];
      const available = pm.jumlah - pm.keluar;
      if (pm.id_produk != id_produk)
        throw new Error("Produk masuk tidak sesuai dengan produk yang dipilih");
      if (requested > available)
        throw new Error(
          `Stok produk masuk tidak mencukupi. Maks. ${available}.`,
        );

      const isStandaloneLoanStock =
        Number(pm.pinjaman) === 1 && pm.id_produkpinjaman == null;
      const loanStockEntryId = isStandaloneLoanStock
        ? await createMarkedLoanPurchaseEntry({
            conn,
            sourceEntry: pm,
            id_produk,
            id_perusahaan_peminjam: consumingCompanyId,
            jumlah: requested,
            tanggal,
            created_by,
            updated_by,
          })
        : await createIntercompanyLoan({
            conn,
            id_produk,
            sourceEntry: pm,
            id_perusahaan_peminjam: consumingCompanyId,
            id_proyek,
            jumlah: requested,
            tanggal,
            keterangan,
            created_by,
            updated_by,
          });
      const outputStockEntryId = loanStockEntryId ?? pm.id;
      if (loanStockEntryId) {
        await conn.execute(
          "UPDATE produkmasuk SET keluar = keluar + ? WHERE id = ?",
          [requested, loanStockEntryId],
        );
      } else {
        await conn.execute(
          `UPDATE produkmasuk SET keluar = keluar + ? WHERE id = ?`,
          [requested, pm.id],
        );
      }
      await conn.execute(`UPDATE produk SET stok = stok - ? WHERE id = ?`, [
        requested,
        id_produk,
      ]);
      await adjustCompanyStock({
        conn,
        id_produk,
        id_perusahaan: consumingCompanyId,
        jumlah: -requested,
        created_by,
        updated_by,
      });
      const [insertResult] = await conn.execute(
        `INSERT INTO ${OUTPUT_TABLE}
         (id_produk, id_produkmasuk, id_proyek, id_jurnal, id_perusahaan,
          created_by, updated_by, metodepengeluaran, jenis_transaksi, sn,
          jumlah, harga, tanggal, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pengeluaran', ?, ?, ?, ?, ?)`,
        [
          id_produk,
          outputStockEntryId,
          id_proyek || null,
          id_jurnal,
          consumingCompanyId,
          created_by,
          updated_by,
          metodepengeluaran,
          0,
          requested,
          pm.harga,
          tanggal,
          keterangan,
        ],
      );
      generatedOutputIds.push(insertResult.insertId);
      generatedJournalAmount += Number(pm.harga || 0) * requested;
      if (isSelected) {
        await conn.execute(
          `INSERT INTO pengeluaranproyek
           (id_proyek, tanggal, id_karyawan, id_produk, id_produkkeluar, id_vendor, jumlah, harga, status, keterangan)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            idproyek ?? id_proyek,
            tanggal,
            karyawan ?? id_karyawan ?? created_by,
            idproduk ?? id_produk,
            insertResult.insertId,
            pm.id_vendor,
            requested,
            pm.harga,
            keterangan,
          ],
        );
      }
    }
    if (
      metodepengeluaran === "proyek" &&
      !id_jurnal &&
      generatedOutputIds.length > 0
    ) {
      const journalId = await createProjectStockUsageJournal(conn, {
        id_proyek: id_proyek ?? idproyek ?? null,
        id_perusahaan: consumingCompanyId,
        tanggal,
        keterangan,
        amount: generatedJournalAmount,
        created_by,
        updated_by,
      });
      for (const outputId of generatedOutputIds) {
        await conn.execute(
          `UPDATE ${OUTPUT_TABLE} SET id_jurnal = ? WHERE id = ?`,
          [journalId, outputId],
        );
      }
    }
    return { success: true };
  }
  if (sn === 1) {
    for (const snObj of serialnumbers) {
      // Lock one eligible produkmasuk row
      let [pmRows] = await conn.execute(
        `SELECT id, id_produk, id_vendor, jumlah, keluar, harga, id_perusahaan,
                (jumlah - keluar) AS available
         FROM produkmasuk
         WHERE jumlah > keluar AND id_produk = ?
         ORDER BY CASE WHEN id_perusahaan = ? THEN 0 ELSE 1 END, harga DESC
         LIMIT 1
         FOR UPDATE`,
        [id_produk, consumingCompanyId],
      );
      if (pmRows.length === 0) {
        throw new Error("Tidak ada produkmasuk tersedia");
      }
      const pm = pmRows[0];

      const loanStockEntryId = await createIntercompanyLoan({
        conn,
        id_produk,
        sourceEntry: pm,
        id_perusahaan_peminjam: consumingCompanyId,
        id_proyek,
        jumlah: 1,
        tanggal,
        keterangan,
        created_by,
        updated_by,
      });
      const outputStockEntryId = loanStockEntryId ?? pm.id;
      await conn.execute(
        `UPDATE produkmasuk SET keluar = keluar + 1 WHERE id = ?`,
        [outputStockEntryId],
      );
      // Update produk stock
      await conn.execute(`UPDATE produk SET stok = stok - 1 WHERE id = ?`, [
        id_produk,
      ]);
      await adjustCompanyStock({
        conn,
        id_produk,
        id_perusahaan: consumingCompanyId,
        jumlah: -1,
        created_by,
        updated_by,
      });
      // Insert the actual stock use against the borrower-side loan lot.
      const [insertResult] = await conn.execute(
        `INSERT INTO ${OUTPUT_TABLE}
         (id_produk, id_produkmasuk, id_jurnal, id_perusahaan, created_by,
          updated_by, metodepengeluaran, jenis_transaksi, sn, jumlah, harga,
          tanggal, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pengeluaran', ?, ?, ?, ?, ?)`,
        [
          id_produk,
          outputStockEntryId,
          id_jurnal,
          consumingCompanyId,
          created_by,
          updated_by,
          metodepengeluaran,
          snObj.value,
          1,
          harga,
          tanggal,
          keterangan,
        ],
      );
      generatedOutputIds.push(insertResult.insertId);
      generatedJournalAmount += Number(harga || 0);
    }
    if (
      metodepengeluaran === "proyek" &&
      !id_jurnal &&
      generatedOutputIds.length > 0
    ) {
      const journalId = await createProjectStockUsageJournal(conn, {
        id_proyek: id_proyek ?? idproyek ?? null,
        id_perusahaan: consumingCompanyId,
        tanggal,
        keterangan,
        amount: generatedJournalAmount,
        created_by,
        updated_by,
      });
      for (const outputId of generatedOutputIds) {
        await conn.execute(
          `UPDATE ${OUTPUT_TABLE} SET id_jurnal = ? WHERE id = ?`,
          [journalId, outputId],
        );
      }
    }
  } else {
    let sisa = jumlah;
    while (sisa > 0) {
      let [pmRows] = await conn.execute(
        `SELECT id, (jumlah - keluar) AS available, harga, id_vendor,
                id_perusahaan, jumlah, keluar
        FROM produkmasuk
        WHERE jumlah > keluar AND id_produk = ?
        ORDER BY CASE WHEN id_perusahaan = ? THEN 0 ELSE 1 END, harga DESC
        LIMIT 1
        FOR UPDATE`,
        [id_produk, consumingCompanyId],
      );
      if (pmRows.length === 0) {
        throw new Error("Tidak ada produkmasuk tersedia");
      }
      const pm = pmRows[0];
      const available = pm.available;
      const take = sisa >= available ? available : sisa;
      sisa -= take;

      const loanStockEntryId = await createIntercompanyLoan({
        conn,
        id_produk,
        sourceEntry: pm,
        id_perusahaan_peminjam: consumingCompanyId,
        id_proyek,
        jumlah: take,
        tanggal,
        keterangan,
        created_by,
        updated_by,
      });
      const outputStockEntryId = loanStockEntryId ?? pm.id;
      await conn.execute(
        `UPDATE produkmasuk SET keluar = keluar + ? WHERE id = ?`,
        [take, outputStockEntryId],
      );
      // Update produk stock
      await conn.execute(`UPDATE produk SET stok = stok - ? WHERE id = ?`, [
        take,
        id_produk,
      ]);
      await adjustCompanyStock({
        conn,
        id_produk,
        id_perusahaan: consumingCompanyId,
        jumlah: -take,
        created_by,
        updated_by,
      });
      // Insert the actual stock use against the borrower-side loan lot.
      const [insertRes] = await conn.execute(
        `INSERT INTO ${OUTPUT_TABLE}
         (metodepengeluaran, id_produk, id_produkmasuk, id_proyek, id_jurnal,
          id_perusahaan, created_by, updated_by, jenis_transaksi, jumlah, harga,
          tanggal, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pengeluaran', ?, ?, ?, ?)`,
        [
          metodepengeluaran ?? "proyek",
          id_produk,
          outputStockEntryId,
          id_proyek || null,
          id_jurnal,
          consumingCompanyId,
          created_by,
          updated_by,
          take,
          metodepengeluaran === "proyek" || isSelected || id_jurnal
            ? pm.harga
            : harga,
          tanggal,
          keterangan,
        ],
      );
      generatedOutputIds.push(insertRes.insertId);
      generatedJournalAmount += Number(pm.harga || 0) * take;

      if (isSelected) {
        // Insert pengeluaranproyek
        await conn.execute(
          `INSERT INTO pengeluaranproyek
           (id_proyek, tanggal, id_karyawan, id_produk, id_produkkeluar, id_vendor, jumlah, harga, status, keterangan)
           VALUES (${
             idproyek ? `(SELECT id FROM proyek WHERE id_second = ?)` : `?`
           }, ?, ${
             karyawan ? `(SELECT id FROM karyawan WHERE nama = ?)` : `?`
           }, ${
             idproduk ? `(SELECT id FROM produk WHERE id_kustom = ?)` : `?`
           }, ?, ?, ?, ?, 1, ?)`,
          [
            idproyek ?? id_proyek,
            tanggal,
            karyawan ?? id_karyawan,
            idproduk ?? id_produk,
            insertRes.insertId,
            pm.id_vendor,
            take,
            pm.harga,
            keterangan ?? "",
          ],
        );
      }
    } // end while
    if (
      metodepengeluaran === "proyek" &&
      !id_jurnal &&
      generatedOutputIds.length > 0
    ) {
      const journalId = await createProjectStockUsageJournal(conn, {
        id_proyek: id_proyek ?? idproyek ?? null,
        id_perusahaan: consumingCompanyId,
        tanggal,
        keterangan,
        amount: generatedJournalAmount,
        created_by,
        updated_by,
      });
      for (const outputId of generatedOutputIds) {
        await conn.execute(
          `UPDATE ${OUTPUT_TABLE} SET id_jurnal = ? WHERE id = ?`,
          [journalId, outputId],
        );
      }
    }
  }

  return { success: true };
}
// Internal helper: delete inside transaction
async function _deleteInTransaction({
  id,
  jumlah,
  id_produkmasuk,
  id_produk,
  metodepengeluaran,
  conn,
}) {
  assertTransaction(conn, "_deleteInTransaction");

  // 1) lock the produkkeluar row
  let [existing] = await conn.execute(
    `SELECT * FROM ${OUTPUT_TABLE} WHERE id = ? FOR UPDATE`,
    [id],
  );
  if (existing.length === 0) {
    throw new Error("Produkkeluar record not found");
  }
  const output = existing[0];
  if (
    output.jenis_transaksi === "pinjaman" ||
    output.jenis_transaksi === "pengembalian"
  ) {
    throw new Error(
      "Transaksi pinjaman/pengembalian tidak dapat dihapus langsung.",
    );
  }
  jumlah = Number(output.jumlah);
  id_produkmasuk = output.id_produkmasuk;
  id_produk = output.id_produk;
  metodepengeluaran = output.metodepengeluaran;

  if (metodepengeluaran === "proyek") {
    // lock related pengeluaranproyek row(s)
    await conn.execute(
      `SELECT id FROM pengeluaranproyek WHERE id_produkkeluar = ? FOR UPDATE`,
      [id],
    );
    await conn.execute(
      `DELETE FROM pengeluaranproyek WHERE id_produkkeluar = ?`,
      [id],
    );
  }

  if (output.id_jurnal) {
    const [[journal]] = await conn.execute(
      `SELECT jf.system_key
       FROM jurnal j
       INNER JOIN jurnal_form jf ON jf.id = j.id_jurnal_form
       WHERE j.id = ?
       FOR UPDATE`,
      [output.id_jurnal],
    );

    if (journal?.system_key === "HPP") {
      const [remainingOutputs] = await conn.execute(
        `SELECT jumlah, harga
         FROM ${OUTPUT_TABLE}
         WHERE id_jurnal = ? AND id <> ?
         FOR UPDATE`,
        [output.id_jurnal, id],
      );

      if (remainingOutputs.length > 0) {
        const remainingAmount = remainingOutputs.reduce(
          (total, row) =>
            total + Number(row.jumlah || 0) * Number(row.harga || 0),
          0,
        );
        await conn.execute(
          `UPDATE transaksi
           SET amount = ?
           WHERE id_jurnal = ? AND keterangan IN ('HPP', 'Persediaan')`,
          [remainingAmount, output.id_jurnal],
        );
      } else {
        await conn.execute("DELETE FROM transaksi WHERE id_jurnal = ?", [
          output.id_jurnal,
        ]);
        await conn.execute("DELETE FROM jurnal WHERE id = ?", [
          output.id_jurnal,
        ]);
      }
    } else {
      await conn.execute("DELETE FROM transaksi WHERE id_jurnal = ?", [
        output.id_jurnal,
      ]);
      await conn.execute("DELETE FROM jurnal WHERE id = ?", [output.id_jurnal]);
    }
  }

  // lock produkmasuk row
  await conn.execute(
    `SELECT id, keluar FROM produkmasuk WHERE id = ? FOR UPDATE`,
    [id_produkmasuk],
  );
  // lock produk row
  await conn.execute(`SELECT id, stok FROM produk WHERE id = ? FOR UPDATE`, [
    id_produk,
  ]);

  // Perform deletion and stock revert
  await conn.execute(`DELETE FROM ${OUTPUT_TABLE} WHERE id = ?`, [id]);
  await conn.execute(
    `UPDATE produkmasuk SET keluar = keluar - ? WHERE id = ?`,
    [jumlah, id_produkmasuk],
  );
  await conn.execute(`UPDATE produk SET stok = stok + ? WHERE id = ?`, [
    jumlah,
    id_produk,
  ]);
  await adjustCompanyStock({
    conn,
    id_produk,
    id_perusahaan: output.id_perusahaan,
    jumlah,
    updated_by: output.updated_by,
  });

  return { success: true };
}

module.exports = {
  list,
  create,
  createInTransaction,
  update,
  destroy,
  destroyByJurnalInTransaction,
  destroyInTransaction,
};
