const { pool } = require("./db.2.0.0");

const table = "aktivitassales";

const list = async ({ id_proyek = "" }) => {
  const sql = `select a.*, i.nama instansi, k.nama karyawan from ${table} a
  left join karyawan k on k.id=a.id_karyawan
  left join proyek p on p.id=a.id_proyek
  left join instansi i on i.id=p.id_instansi
  where 1=1${id_proyek ? " and id_proyek=? " : ""}
  order by a.tanggal desc
  limit 50
  `;
  const values = [...(id_proyek ? [id_proyek] : [])];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({
  id_karyawan,
  id_proyek,
  aktivitas,
  catatan = "",
  output = "",
  tindakanselanjutnya = "",
  tanggal,
}) => {
  if (!aktivitas) throw new Error("Aktivitas wajib diisi!");
  const sql = `insert into ${table} (id_karyawan, id_proyek, aktivitas, catatan, output, tindakanselanjutnya, tanggal) values (?,?,?,?,?,?,?)`;
  const values = [
    id_karyawan,
    id_proyek,
    aktivitas,
    catatan,
    output,
    tindakanselanjutnya,
    tanggal,
  ];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const update = async ({
  id,
  id_karyawan,
  id_proyek,
  aktivitas,
  catatan,
  output,
  tindakanselanjutnya,
  tanggal,
}) => {
  const fields = [];
  const values = [];
  const isExist = (v) => v != null;
  if (isExist(id_karyawan)) {
    fields.push("id_karyawan=?");
    values.push(id_karyawan);
  }
  if (isExist(id_proyek)) {
    fields.push("id_proyek=?");
    values.push(id_proyek);
  }
  if (isExist(aktivitas)) {
    fields.push("aktivitas=?");
    values.push(aktivitas);
  }
  if (isExist(catatan)) {
    fields.push("catatan=?");
    values.push(catatan);
  }
  if (isExist(output)) {
    fields.push("output=?");
    values.push(output);
  }
  if (isExist(tindakanselanjutnya)) {
    fields.push("tindakanselanjutnya=?");
    values.push(tindakanselanjutnya);
  }
  if (isExist(tanggal)) {
    fields.push("tanggal=?");
    values.push(tanggal);
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id =?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy };
