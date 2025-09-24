const { pool } = require("./db.2.0.0.cjs");

const table = "proyek_keteranganpenawaran";

const list = async ({ id }) => {
  const sql = `select * from ${table}${id ? " where id =?" : ""}`;
  const values = [];
  if (id) values.push(id);
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({ idProyek, idKeteranganPenawaran }) => {
  const sql = `insert into ${table} (id_proyek, id_KeteranganPenawaran) values (?,?)`;
  const values = [idProyek, idKeteranganPenawaran];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const update = async ({ keterangan, id }) => {
  const sql = `update ${table} set keterangan=? where id =?`;
  const values = [keterangan, id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const destroy = async ({ idProyek, idKeteranganPenawaran }) => {
  const sql = `delete from ${table} where id_proyek=? and id_keteranganpenawaran=?`;
  const values = [idProyek, idKeteranganPenawaran];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy };
