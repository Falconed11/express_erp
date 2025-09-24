const { pool } = require("./db.2.0.0.cjs");

const table = "instansi";

const list = async ({ id, limit }) => {
  const pembayaran = `select id_instansi id, sum(nominal) pembayaran from pembayaranproyek pp left join proyek p on pp.id_proyek=p.id group by id_instansi`;
  const produksi = `select id_instansi id, sum(jumlah*harga) produksi, count(*) jumlah_proyek from pengeluaranproyek pp left join proyek p on pp.id_proyek=p.id group by id`;
  const jumlah_proyek = `select id_instansi id, count(*) jumlah_proyek from proyek group by id_instansi`;
  const sql = `select i.swasta, i.kota, i.id, i.nama, i.alamat, coalesce((pm.pembayaran-p.produksi),0) provit, coalesce(jp.jumlah_proyek,0) jumlah_proyek, i.lastuser, i.lastupdate, k.nama namakaryawan from ${table} i
  left join (${pembayaran}) pm on i.id=pm.id
  left join (${produksi}) p on i.id=p.id
  left join (${jumlah_proyek}) jp on i.id = jp.id
  left join karyawan k on k.id=i.lastuser
  where 1=1 ${id ? "and i.id=?" : ""} order by i.nama ${
    limit ? "limit ?" : ""
  }`;
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

const transfer = async ({ currentId, targetId }) => {
  const sql = "update proyek set id_instansi = ? where id_instansi = ?";
  const values = [targetId, currentId];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({ nama, swasta, kota, alamat = "", lastuser = null }) => {
  if (!nama) throw new Error("Nama wajib diisi!");
  if (!kota) throw new Error("Kota wajib diisi!");
  if (!swasta) throw new Error("Swasta/Negri wajib dipilih!");
  const sql = `insert into ${table} (nama, swasta, kota, alamat, lastuser) values (?,?,?,?,?)`;
  const values = [nama, swasta, kota, alamat, lastuser];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const update = async ({ id, nama, swasta, kota, alamat, lastuser = null }) => {
  const sql = `update ${table} set nama=?, swasta=?, kota=?, alamat=?, lastuser=? where id=?`;
  const values = [nama, swasta, kota, alamat, lastuser, id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy, transfer };
