const { withTransaction } = require("../helpers/transaction.cjs");
const { create: insertInstansi } = require("./customer.cjs");
const { pool } = require("./db.2.0.0.cjs");

const table = "aktivitassales";

const list = async ({
  id,
  id_instansi,
  id_karyawan,
  page = null,
  rowsPerPage = null,
  start = null,
  end = null,
}) => {
  console.log(id_karyawan);
  const conditions = [
    ...(id ? ["a.id = ?"] : []),
    ...(id_instansi ? ["a.id_instansi = ?"] : []),
    ...(id_karyawan ? ["a.id_karyawan = ?"] : []),
    ...(start ? ["a.tanggal >= ?"] : []),
    ...(end ? ["a.tanggal <= ?"] : []),
  ];
  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const limitClause = page && rowsPerPage ? "LIMIT ? OFFSET ?" : "";
  const sql = `select a.*, k.nama namakaryawan, i.nama namainstansi from ${table} a
left join karyawan k on k.id=a.id_karyawan
left join instansi i on i.id=a.id_instansi
  ${whereClause} order by a.tanggal desc ${limitClause}`;
  console.log(sql);
  const valuesCount = [
    ...(id ? [id] : []),
    ...(id_instansi ? [id_instansi] : []),
    ...(id_karyawan ? [id_karyawan] : []),
    ...(start ? [start] : []),
    ...(end ? [end] : []),
  ];
  const values = [
    ...valuesCount,
    ...(page && rowsPerPage ? [rowsPerPage, (page - 1) * rowsPerPage] : []),
  ];
  console.log(values);
  const [rows] = await pool.execute(sql, values);
  const res =
    page && rowsPerPage
      ? await pool.execute(
          `select count(*) count from ${table} a ${whereClause}`,
          valuesCount
        )
      : null;
  const count = res?.[0]?.[0]?.count ?? 0;
  return { count, results: rows };
};

const create = async ({
  id_karyawan,
  id_proyek = null,
  id_instansi = null,
  pic = "",
  aktivitas,
  catatan = "",
  output = "",
  tindakanselanjutnya = "",
  instansi = null,
  ...rest
}) => {
  try {
    const result = await withTransaction(pool, async (conn) => {
      if (!aktivitas || !id_karyawan)
        throw new Error("Aktivitas dan Karyawan wajib diisi!");
      const sql = `insert into ${table} (id_karyawan, id_proyek, id_instansi, pic, aktivitas, catatan, output, tindakanselanjutnya) values (?,?,?,?,?,?,?,?)`;
      if (!id_instansi && instansi) {
        id_instansi = await insertInstansi({ ...rest, nama: instansi, conn });
      }
      const values = [
        id_karyawan,
        id_proyek,
        id_instansi,
        pic,
        aktivitas,
        catatan,
        output,
        tindakanselanjutnya,
      ];
      const [rows] = await conn.execute(sql, values);
      return {
        insertIdAktivitasSales: rows.insertId,
        insertIdInstansi: id_instansi,
      };
    });
    console.log(result);
    console.log("Data berhasil ditambahkan.");
    return result;
  } catch (err) {
    console.error("Error: ", err.message);
    throw err;
  }
};

const update = async ({ id, isSelesai = null, ...rest }) => {
  if (id == null) throw new Error("Id tidak valid");
  const fields = [],
    values = [];
  if (isSelesai == true) {
    const res = await list({ id });
    const rows = res?.results;
    if (!rows.length)
      throw new Error(`Aktivitas Sales id: ${id} tidak ditemukan`);
    const now = new Date();
    if (
      !(
        new Date(rows[0].tanggal).setHours(0, 0, 0, 0) <
          now.setHours(0, 0, 0, 0) || now.getHours() >= 16
      )
    )
      throw new Error(
        "Penyelesaian dihari yang sama hanya dapat dilakukan setelah pukul 16.00 WIB."
      );
    if (!rows[0].tanggalselesai) {
      fields.push("tanggalselesai=?");
      values.push(new Date());
    }
  }
  if (isSelesai == false) {
    fields.push("tanggalselesai=?");
    values.push(null);
  }
  const allowedFields = [
    "id_karyawan",
    "id_proyek",
    "id_instansi",
    "pic",
    "aktivitas",
    "catatan",
    "output",
    "tindakanselanjutnya",
  ];
  for (const [key, value] of Object.entries(rest)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key}=?`);
      values.push(value);
    }
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  console.log(sql);
  const [result] = await pool.execute(sql, values);
  return result;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id =?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy };
