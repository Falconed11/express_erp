const { pool } = require("./db.2.0.0.cjs");
const table = "merek";

const list = async () => {
  const sql = `Select * From ${table} order by nama`;
  const [result] = await pool.execute(sql);
  return result;
};

const transfer = async ({ currentId, targetId }) => {
  const sql = "update produk set id_merek = ? where id_merek = ?";
  const values = [targetId, currentId];
  const [result] = await pool.execute(sql, values);
  return result;
};

const create = async ({ nama }) => {
  if (!nama) throw new Error("Nama wajin diisi!");
  const sql = `insert into ${table} (nama) values (?)`;
  const values = [nama];
  const [result] = await pool.execute(sql, values);
  return result;
};

const update = async ({ id, nama }) => {
  if (!nama) throw new Error("Nama wajin diisi!");
  const sql = `update ${table} set nama=? where id=?`;
  const values = [nama, id];
  const [result] = await pool.execute(sql, values);
  return result;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [result] = await pool.execute(sql, values);
  return result;
};

module.exports = { list, create, update, destroy, transfer };
