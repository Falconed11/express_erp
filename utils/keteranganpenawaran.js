const { pool } = require("./db.2.0.0");

const table = "keteranganpenawaran";

const list = async ({ idProyekKeteranganPenawaran, idProyek }) => {
  const sql = `select kp.*, pk.id_proyek, pk.id_keteranganpenawaran from ${table} kp 
  left join proyek_keteranganpenawaran pk on kp.id=pk.id_keteranganpenawaran and pk.id_proyek=? 
  where 1=1`;
  const values = [idProyek ?? null];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({ keterangan }) => {
  const sql = `insert into ${table} (keterangan) values (?)`;
  const values = [keterangan];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const update = async ({ keterangan, id }) => {
  const sql = `update ${table} set keterangan=? where id =?`;
  const values = [keterangan, id];
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
