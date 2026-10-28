const { pool } = require("./db.2.0.0.cjs");
const { insertProduk } = require("./produk.cjs");
const {
  assertTransaction,
  withTransaction,
} = require("../helpers/transaction.cjs");
const {
  invalidateApproval,
  invalidateProjectApprovals,
} = require("../src/modules/project-approval/project-approval-invalidation.cjs");
const {
  copyForVersion: copyKeteranganKhususForVersion,
} = require("./keterangan-khusus-penawaran.cjs");
const { recalculateRecapTax } = require("./rekapitulasiproyek-pajak.cjs");
const table = "keranjangproyek";

const list = async ({ id_proyek, instalasi, versi, id_perusahaan }) => {
  const sql = `Select sp.id id_subproyek, sp.nama subproyek, kpr.nama kategoriproduk, kp.id id_keranjangproyek, kp.jumlah, kp.hargamodal temphargamodal, kp.harga, kp.hargakustom, kp.instalasi, kp.showmerek, kp.showtipe, kp.keterangan, m.nama nmerek, v.nama nvendor, p.id id_produk, p.nama, p.stok, coalesce(psp.stok, 0) stok_perusahaan, p.tipe, p.hargamodal, p.hargajual, p.hargabatas, p.satuan, p.tanggal From ${table} kp
  left join subproyek sp on kp.id_subproyek = sp.id 
  left join produk p on kp.id_produk = p.id 
  left join produkstokperusahaan psp on psp.id_produk = p.id and psp.id_perusahaan = ?
  left join kategoriproduk kpr on p.id_kategori=kpr.id 
  left join merek m on p.id_merek=m.id 
  left join vendor v on p.id_vendor=v.id where 1=1 ${
    id_proyek ? `and kp.id_proyek=?` : ""
  } ${instalasi ? `and instalasi = ?` : ""} and versi=?
  ORDER BY COALESCE(kp.urutan, kp.id), kp.id`;
  const values = [id_perusahaan ?? null];
  if (id_proyek) values.push(id_proyek);
  if (instalasi) values.push(instalasi);
  values.push(versi);
  const [rows] = await pool.execute(sql, values);
  return rows || [];
};

const listVersion = async ({ id_proyek }) => {
  const sql = `select distinct versi from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  }`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  const [rows] = await pool.execute(sql, values);
  return rows || [];
};

/**
 * @returns {Promise<{
 *   keranjangProyekInsertId: number;
 *   produkInsertId: number;
 * }>}
 */
const insertKeranjangProyek = async ({
  produk,
  id_produk,
  id_proyek,
  id_subproyek = null,
  jumlah,
  hargamodal = 0,
  harga = 0,
  hargakustom = null,
  instalasi = 0,
  namakustom = "",
  versi = 1,
  userRole,
  conn,
  ...rest
}) => {
  assertTransaction(conn, insertKeranjangProyek.name);
  if (!id_produk && !produk) throw new Error(`Produk Belum Dipilih`);
  if (!jumlah) throw new Error(`Jumlah Belum Diisi`);
  if (!id_produk && produk)
    id_produk = (
      await insertProduk({
        ...rest,
        nama: produk,
        hargamodal,
        hargajual: harga,
        // tanggal: tanggal || new Date(),
        conn,
      })
    )?.produkInsertId;
  if (["sales", "head-sales"].includes(userRole) && id_produk) {
    const [productRows] = await conn.execute(
      "SELECT hargamodal FROM produk WHERE id = ?",
      [id_produk],
    );
    if (!productRows.length) throw new Error("Produk tidak ditemukan.");
    hargamodal = productRows[0].hargamodal ?? 0;
  }
  const sql = `insert into ${table} (id_produk, id_proyek, id_subproyek, jumlah, hargamodal, harga, hargakustom, instalasi, keterangan, versi) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [
    id_produk,
    id_proyek,
    id_subproyek || null,
    jumlah,
    hargamodal ?? 0,
    harga ?? 0,
    hargakustom,
    instalasi ?? 0,
    namakustom,
    versi,
  ];
  const [result] = await conn.execute(sql, values);
  await recalculateRecapTax(conn, id_proyek, versi);
  await invalidateApproval(conn, id_proyek, versi);
  return {
    keranjangProyekInsertId: result.insertId,
    produkInsertId: id_produk,
  };
};

const create = async (rest) => {
  try {
    // return rest;
    const result = await withTransaction(pool, async (conn) => {
      const res = await insertKeranjangProyek({ ...rest, conn });
      return res;
    });
    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const createNewVersion = async ({ id_proyek, versi }) =>
  withTransaction(pool, async (conn) => {
    await conn.execute("SELECT id FROM proyek WHERE id = ? FOR UPDATE", [
      id_proyek,
    ]);
    const [versionRows] = await conn.execute(
      `SELECT COALESCE(MAX(versi), 0) + 1 AS next_version
       FROM ${table}
       WHERE id_proyek = ?`,
      [id_proyek],
    );
    const targetVersion = Number(versionRows[0]?.next_version);
    const [result] = await conn.execute(
      `INSERT INTO ${table}
         (id_proyek, id_produk, jumlah, harga, instalasi, keterangan, versi, urutan)
       SELECT id_proyek, id_produk, jumlah, harga, instalasi, keterangan, ?, urutan
       FROM ${table}
       WHERE id_proyek = ? AND versi = ?`,
      [targetVersion, id_proyek, versi],
    );
    await copyKeteranganKhususForVersion(conn, id_proyek, versi, targetVersion);
    return result;
  });
const update = async ({
  id,
  id_produk,
  isUpdateHarga,
  tanggal,
  updated_by,
  ...rest
}) => {
  const allowedColumns = new Set([
    "id_subproyek",
    "jumlah",
    "hargamodal",
    "harga",
    "hargakustom",
    "instalasi",
    "showmerek",
    "showtipe",
    "keterangan",
    "urutan",
  ]);
  const fields = [];
  const values = [];

  if (rest.namakustom !== undefined) {
    rest.keterangan = rest.namakustom === "" ? null : rest.namakustom;
    delete rest.namakustom;
  }

  for (const [key, value] of Object.entries(rest)) {
    if (!allowedColumns.has(key)) continue;
    const columnValue = key === "hargakustom" && value === "" ? null : value;
    fields.push(`${key} = ?`);
    values.push(columnValue);
  }

  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };

  return await withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      "select id, id_produk, id_proyek, versi from keranjangproyek where id = ? for update",
      [id],
    );
    const currentRow = rows[0];
    if (!currentRow) throw new Error("Keranjang proyek tidak ditemukan.");
    const idProduk = currentRow.id_produk;
    console.log({ id, id_produk, idProduk, isUpdateHarga, tanggal, ...rest });
    await conn.execute("select id from produk where id = ? for update", [
      id_produk || (await idProduk),
    ]);
    values.push(id);
    let sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
    const [result] = await conn.execute(sql, values);
    await invalidateApproval(
      conn,
      currentRow.id_proyek,
      currentRow.versi,
      updated_by,
    );
    if (isUpdateHarga) {
      sql = `UPDATE produk SET hargamodal = ?, hargajual = ?, tanggal = ? WHERE id = ?`;
      await conn.execute(sql, [
        rest.hargamodal,
        rest.harga,
        tanggal,
        id_produk,
      ]);
    }
    await recalculateRecapTax(conn, currentRow.id_proyek, currentRow.versi);
    return result;
  });
};

const reorder = async ({ ids, updated_by }) => {
  if (!Array.isArray(ids) || ids.length < 2) {
    throw new Error("Pilih minimal dua produk untuk mengubah urutan.");
  }
  const normalizedIds = ids.map(Number);
  if (
    normalizedIds.some((id) => !Number.isInteger(id) || id <= 0) ||
    new Set(normalizedIds).size !== normalizedIds.length
  ) {
    throw new Error("Daftar produk untuk diurutkan tidak valid.");
  }

  return withTransaction(pool, async (conn) => {
    const placeholders = normalizedIds.map(() => "?").join(", ");
    const [rows] = await conn.execute(
      `SELECT id, id_proyek, versi, instalasi, id_subproyek
       FROM ${table}
       WHERE id IN (${placeholders})
       FOR UPDATE`,
      normalizedIds,
    );
    if (rows.length !== normalizedIds.length) {
      throw new Error("Sebagian produk tidak ditemukan.");
    }

    const firstRow = rows[0];
    const sameGroup = rows.every(
      (row) =>
        Number(row.id_proyek) === Number(firstRow.id_proyek) &&
        Number(row.versi) === Number(firstRow.versi) &&
        Number(row.instalasi) === Number(firstRow.instalasi) &&
        (row.id_subproyek ?? null) === (firstRow.id_subproyek ?? null),
    );
    if (!sameGroup) {
      throw new Error("Produk harus berada dalam sub proyek yang sama.");
    }

    for (const [urutan, id] of normalizedIds.entries()) {
      await conn.execute(`UPDATE ${table} SET urutan = ? WHERE id = ?`, [
        urutan,
        id,
      ]);
    }
    await invalidateApproval(
      conn,
      firstRow.id_proyek,
      firstRow.versi,
      updated_by,
    );
    return { affectedRows: normalizedIds.length };
  });
};

const updateHargaJualByPersenProvit = async ({ id_proyek, persenProvit }) => {
  const sql = `UPDATE keranjangproyek SET harga = ceil(hargamodal*(1+?/100)) WHERE id_proyek = ?`;
  const values = [persenProvit, id_proyek];
  return await withTransaction(pool, async (conn) => {
    const [result] = await conn.execute(sql, values);
    const [versions] = await conn.execute(
      "SELECT versi FROM rekapitulasiproyek WHERE id_proyek = ?",
      [id_proyek],
    );
    for (const { versi } of versions) {
      await recalculateRecapTax(conn, id_proyek, versi);
    }
    await invalidateProjectApprovals(conn, id_proyek);
    return result;
  });
};

const destroy = async ({ id, updated_by }) =>
  await withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id_proyek, versi FROM ${table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!rows.length) return { affectedRows: 0 };
    const [result] = await conn.execute(`DELETE FROM ${table} WHERE id = ?`, [
      id,
    ]);
    await recalculateRecapTax(conn, rows[0].id_proyek, rows[0].versi);
    await invalidateApproval(
      conn,
      rows[0].id_proyek,
      rows[0].versi,
      updated_by,
    );
    return result;
  });

module.exports = {
  list,
  listVersion,
  create,
  createNewVersion,
  update,
  reorder,
  updateHargaJualByPersenProvit,
  insertKeranjangProyek,
  destroy,
};
