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

async function list({ id_produk, id_jurnal, id_perusahaan, filterText }) {
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
             m.nama AS merek,
             v.nama AS vendor,
             pk.*,
             pr.id AS id_proyek,
             pr.nama AS nama_proyek,
             i.nama AS nama_instansi
      FROM ${OUTPUT_TABLE} pk
      LEFT JOIN produk p           ON p.id = pk.id_produk
      LEFT JOIN produkmasuk pm     ON pm.id = pk.id_produkmasuk
      LEFT JOIN merek m            ON m.id = p.id_merek
      LEFT JOIN vendor v           ON v.id = p.id_vendor
      LEFT JOIN proyek pr          ON pr.id = pk.id_proyek
      LEFT JOIN instansi i         ON i.id = pr.id_instansi
      WHERE 1 = 1
      ${hasIdProduk ? "AND pk.id_produk = ?" : ""}
      ${id_jurnal ? "AND pk.id_jurnal = ?" : ""}
      ${id_perusahaan ? "AND pk.id_perusahaan = ?" : ""}
      ${hasFilterText ? words.map(() => "AND LOWER(CONCAT_WS(' ', COALESCE(p.id_kustom, ''), COALESCE(p.nama, ''), COALESCE(p.tipe, ''), COALESCE(m.nama, ''), COALESCE(v.nama, ''), COALESCE(pr.nama, ''), COALESCE(i.nama, ''), COALESCE(pk.keterangan, ''))) LIKE ?").join(" ") : ""}
      order by pk.tanggal desc, pk.id desc
    `;
    const params = [];
    if (hasIdProduk) params.push(id_produk);
    if (id_jurnal) params.push(id_jurnal);
    if (id_perusahaan) params.push(id_perusahaan);
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
        `SELECT id, id_produk, id_vendor, jumlah, keluar, harga, id_perusahaan
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

      await conn.execute(
        `UPDATE produkmasuk SET keluar = keluar + ? WHERE id = ?`,
        [requested, pm.id],
      );
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
         (id_produk, id_produkmasuk, id_proyek, id_jurnal, id_perusahaan, created_by, updated_by, metodepengeluaran, sn, jumlah, harga, tanggal, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_produk,
          pm.id,
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
      await recordCompanyLoan(conn, {
        id_produkkeluar: insertResult.insertId,
        id_produkmasuk: pm.id,
        id_produk,
        id_perusahaan_pemberi: pm.id_perusahaan,
        id_perusahaan_peminjam: consumingCompanyId,
        jumlah: requested,
        created_by,
      });
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
    return { success: true };
  }
  if (sn === 1) {
    for (const snObj of serialnumbers) {
      // Lock one eligible produkmasuk row
      let [pmRows] = await conn.execute(
        `SELECT id, id_perusahaan FROM produkmasuk
         WHERE jumlah > keluar AND id_produk = ?
         ORDER BY harga DESC
         LIMIT 1
         FOR UPDATE`,
        [id_produk],
      );
      if (pmRows.length === 0) {
        throw new Error("Tidak ada produkmasuk tersedia");
      }
      const pm = pmRows[0];

      // Update produkmasuk
      await conn.execute(
        `UPDATE produkmasuk SET keluar = keluar + 1 WHERE id = ?`,
        [pm.id],
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
      // Insert into produkkeluar
      const [insertResult] = await conn.execute(
        `INSERT INTO ${OUTPUT_TABLE}
         (id_produk, id_produkmasuk, id_jurnal, id_perusahaan, created_by, updated_by, metodepengeluaran, sn, jumlah, harga, tanggal, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_produk,
          pm.id,
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
      await recordCompanyLoan(conn, {
        id_produkkeluar: insertResult.insertId,
        id_produkmasuk: pm.id,
        id_produk,
        id_perusahaan_pemberi: pm.id_perusahaan,
        id_perusahaan_peminjam: consumingCompanyId,
        jumlah: 1,
        created_by,
      });
    }
  } else {
    let sisa = jumlah;
    while (sisa > 0) {
      let [pmRows] = await conn.execute(
        `SELECT id, (jumlah - keluar) AS available, harga, id_vendor, id_perusahaan
         FROM produkmasuk
         WHERE jumlah > keluar AND id_produk = ?
         ORDER BY harga DESC
         LIMIT 1
         FOR UPDATE`,
        [id_produk],
      );
      if (pmRows.length === 0) {
        throw new Error("Tidak ada produkmasuk tersedia");
      }
      const pm = pmRows[0];
      const available = pm.available;
      const take = sisa >= available ? available : sisa;
      sisa -= take;

      // Update produkmasuk
      await conn.execute(
        `UPDATE produkmasuk SET keluar = keluar + ? WHERE id = ?`,
        [take, pm.id],
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
      // Insert into produkkeluar
      const [insertRes] = await conn.execute(
        `INSERT INTO ${OUTPUT_TABLE}
         (metodepengeluaran, id_produk, id_produkmasuk, id_proyek, id_jurnal, id_perusahaan, created_by, updated_by, jumlah, harga, tanggal, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metodepengeluaran ?? "proyek",
          id_produk,
          pm.id,
          id_proyek || null,
          id_jurnal,
          consumingCompanyId,
          created_by,
          updated_by,
          take,
          isSelected || id_jurnal ? pm.harga : harga,
          tanggal,
          keterangan,
        ],
      );
      await recordCompanyLoan(conn, {
        id_produkkeluar: insertRes.insertId,
        id_produkmasuk: pm.id,
        id_produk,
        id_perusahaan_pemberi: pm.id_perusahaan,
        id_perusahaan_peminjam: consumingCompanyId,
        jumlah: take,
        created_by,
      });

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
