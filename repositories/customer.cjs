const { pool } = require("./db.2.0.0.cjs");

const table = "instansi";

const list = async ({ id, limit }) => {
  const pembayaran = `select id_instansi id, sum(nominal) pembayaran from pembayaranproyek pp left join proyek p on pp.id_proyek=p.id group by id_instansi`;
  const produksi = `select id_instansi id, sum(jumlah*harga) produksi, count(*) jumlah_proyek from pengeluaranproyek pp left join proyek p on pp.id_proyek=p.id group by id`;
  const jumlah_proyek = `select id_instansi id, count(*) jumlah_proyek from proyek group by id_instansi`;
  const sql = `select ji.nama jenisinstansi, gi.nama golonganinstansi, i.id_jenisinstansi, i.id_golonganinstansi, i.swasta, i.kota, i.id, i.nama, i.alamat, coalesce((pm.pembayaran-p.produksi),0) provit, coalesce(jp.jumlah_proyek,0) jumlah_proyek, i.lastuser, i.lastupdate, k.nama namakaryawan from ${table} i
  left join (${pembayaran}) pm on i.id=pm.id
  left join (${produksi}) p on i.id=p.id
  left join (${jumlah_proyek}) jp on i.id = jp.id
  left join karyawan k on k.id=i.lastuser
  left join jenisinstansi ji on ji.id=i.id_jenisinstansi
  left join golonganinstansi gi on gi.id=i.id_golonganinstansi
  where 1=1 ${id ? "and i.id=?" : ""}
  order by i.nama ${limit ? "limit ?" : ""}`;
  const values = [];
  if (id) values.push(id);
  if (limit) values.push(limit);
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const pembayaran = async () => {
  const sql = `select id_instansi id, sum(nominal) from pembayaranproyek pp left join proyek p on pp.id_proyek=p.id group by id_instansi`;
  const values = [];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const produksi = async () => {
  const sql = `select id_instansi id, sum(jumlah*harga) produksi from pengeluaranproyek pp left join proyek p on pp.id_proyek=p.id group by id`;
  const values = [];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const transfer = async ({ id, newId }) => {
  if (!id) throw new Error("Id lama wajib diisi!");
  if (!newId) throw new Error("Id baru wajib diisi!");
  const field = "id_instansi";
  try {
    const sql = `update proyek set ${field}= ? where ${field} = ?`;
    const values = [newId, id];
    const [res] = await pool.execute(sql, values);
    return res;
  } catch (err) {
    console.error("Query error: ", err);
    throw err;
  }
};

const create = async ({
  nama,
  swasta,
  id_jenisinstansi = null,
  id_golonganinstansi = null,
  kota,
  alamat = "",
  lastuser = null,
  conn = pool,
}) => {
  if (!nama || !kota || !swasta)
    throw new Error("Nama, Kota, dan Swasta/Negri wajib diisi!");
  const sql = `insert into ${table} (nama, swasta, id_jenisinstansi, id_golonganinstansi, kota, alamat, lastuser) values (?,?,?,?,?,?,?)`;
  const values = [
    nama,
    swasta,
    id_jenisinstansi,
    id_golonganinstansi,
    kota,
    alamat,
    lastuser,
  ];
  const [result] = await conn.execute(sql, values);
  return result.insertId;
};

const update = async ({ id, ...rest }) => {
  const allowedFields = [
    "nama",
    "swasta",
    "id_jenisinstansi",
    "id_golonganinstansi",
    "kota",
    "alamat",
    "lastuser",
  ];
  const fields = [];
  const values = [];
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
  [updateResult] = await pool.execute(sql, values);
  return updateResult;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy, transfer };
