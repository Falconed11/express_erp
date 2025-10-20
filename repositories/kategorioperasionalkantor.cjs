const { pool } = require("./db.2.0.0.cjs");

const table = "kategorioperasionalkantor";

const list = async () => {
  const sql = `Select * From ${table} order by nama`;
  const values = [];
  const [res] = await pool.execute(sql, values);
  return res;
};

const create = async ({ nama }) => {
  if (!nama) throw new Error("Nama wajib diisi!");
  const sql = `insert into ${table} (nama) values ('${nama}')`;
  const values = [];
  const [res] = await pool.execute(sql, values);
  return res;
};

const update = async ({ id, nama }) => {
  if (!nama) throw new Error("Nama wajib diisi!");
  const sql = `update ${table} set nama=? where id=?`;
  const values = [nama, id];
  const [res] = await pool.execute(sql, values);
  return res;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [res] = await pool.execute(sql, values);
  return res;
};

module.exports = { list, create, update, destroy };
