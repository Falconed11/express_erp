// produkkeluar.service.js
const {
  withTransaction,
  assertTransaction,
} = require("../helpers/transaction.cjs");
const { pool } = require("./db.2.0.0.cjs");

const OUTPUT_TABLE = "produkkeluar";

async function list({ id_produk }) {
  const conn = await pool.getConnection();
  try {
    let sql = `
      SELECT p.nama AS produk,
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
      ${id_produk ? "AND pk.id_produk = ?" : ""}
    `;
    const params = id_produk ? [id_produk] : [];
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
async function update(params) {
  return await withTransaction(pool, async (conn) => {
    console.log({ conn });
    const {
      id,
      sn = null,
      id_produkmasuk,
      id_produk,
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
    return await _deleteInTransaction({ ...params, conn });
  });
}

// Internal helper: create inside transaction
async function _createInTransaction({
  id_produk,
  sn,
  metodepengeluaran,
  serialnumbers,
  jumlah = 0,
  harga = 0,
  tanggal,
  keterangan = "",
  isSelected,
  idproyek,
  id_proyek,
  karyawan,
  id_karyawan = null,
  idproduk,
  status,
  conn,
}) {
  assertTransaction(conn, "_createInTransaction");
  if ((!sn || sn === 0) && (!jumlah || jumlah === 0))
    throw new Error("Jumlah tidak boleh 0!");
  let [produkRows] = await conn.execute(
    `SELECT stok, satuan FROM produk WHERE id = ? FOR UPDATE`,
    [id_produk]
  );
  if (produkRows.length === 0) throw new Error("Produk tidak ditemukan");
  const produk = produkRows[0];
  if (jumlah > produk.stok)
    throw new Error(
      `Stok tidak mencukupi. Maks. ${produk.stok} ${produk.satuan}.`
    );
  if (sn === 1) {
    for (const snObj of serialnumbers) {
      // Lock one eligible produkmasuk row
      let [pmRows] = await conn.execute(
        `SELECT id FROM produkmasuk
         WHERE jumlah > keluar AND id_produk = ?
         ORDER BY harga DESC
         LIMIT 1
         FOR UPDATE`,
        [id_produk]
      );
      if (pmRows.length === 0) {
        throw new Error("Tidak ada produkmasuk tersedia");
      }
      const pm = pmRows[0];

      // Update produkmasuk
      await conn.execute(
        `UPDATE produkmasuk SET keluar = keluar + 1 WHERE id = ?`,
        [pm.id]
      );
      // Update produk stock
      await conn.execute(`UPDATE produk SET stok = stok - 1 WHERE id = ?`, [
        id_produk,
      ]);
      // Insert into produkkeluar
      await conn.execute(
        `INSERT INTO ${OUTPUT_TABLE}
         (id_produk, id_produkmasuk, metodepengeluaran, sn, jumlah, harga, tanggal, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_produk,
          pm.id,
          metodepengeluaran,
          snObj.value,
          1,
          harga,
          tanggal,
          keterangan,
        ]
      );
    }
  } else {
    let sisa = jumlah;
    while (sisa > 0) {
      let [pmRows] = await conn.execute(
        `SELECT id, (jumlah - keluar) AS available, harga, id_vendor
         FROM produkmasuk
         WHERE jumlah > keluar AND id_produk = ?
         ORDER BY harga DESC
         LIMIT 1
         FOR UPDATE`,
        [id_produk]
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
        [take, pm.id]
      );
      // Update produk stock
      await conn.execute(`UPDATE produk SET stok = stok - ? WHERE id = ?`, [
        take,
        id_produk,
      ]);
      // Insert into produkkeluar
      const [insertRes] = await conn.execute(
        `INSERT INTO ${OUTPUT_TABLE}
         (metodepengeluaran, id_produk, id_produkmasuk, id_proyek, jumlah, harga, tanggal, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metodepengeluaran ?? "proyek",
          id_produk,
          pm.id,
          id_proyek || null,
          take,
          isSelected ? pm.harga : harga,
          tanggal,
          keterangan,
        ]
      );

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
          ]
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
    [id]
  );
  if (existing.length === 0) {
    throw new Error("Produkkeluar record not found");
  }

  if (metodepengeluaran === "proyek") {
    // lock related pengeluaranproyek row(s)
    await conn.execute(
      `SELECT id FROM pengeluaranproyek WHERE id_produkkeluar = ? FOR UPDATE`,
      [id]
    );
    await conn.execute(
      `DELETE FROM pengeluaranproyek WHERE id_produkkeluar = ?`,
      [id]
    );
  }

  // lock produkmasuk row
  await conn.execute(
    `SELECT id, keluar FROM produkmasuk WHERE id = ? FOR UPDATE`,
    [id_produkmasuk]
  );
  // lock produk row
  await conn.execute(`SELECT id, stok FROM produk WHERE id = ? FOR UPDATE`, [
    id_produk,
  ]);

  // Perform deletion and stock revert
  await conn.execute(`DELETE FROM ${OUTPUT_TABLE} WHERE id = ?`, [id]);
  await conn.execute(
    `UPDATE produkmasuk SET keluar = keluar - ? WHERE id = ?`,
    [jumlah, id_produkmasuk]
  );
  await conn.execute(`UPDATE produk SET stok = stok + ? WHERE id = ?`, [
    jumlah,
    id_produk,
  ]);

  return { success: true };
}

module.exports = { list, create, update, destroy };
