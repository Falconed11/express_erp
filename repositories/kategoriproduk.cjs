const { pool } = require("./db.2.0.0.cjs");
const table = "kategoriproduk";

const list = async () => {
  const sql = `Select k.*, coalesce(count(p.id)) nproduk From ${table} k
  left join produk p on p.id_kategori=k.id
  group by k.id
  order by nama`;
  const [result] = await pool.execute(sql);
  return result;
};

const transfer = async ({ currentId, targetId }) => {
  const sql = "update produk set id_ketegori = ? where id_ketegori = ?";
  const values = [targetId, currentId];
  const [result] = await pool.execute(sql, values);
  return result;
};

const create = async ({ nama, conn = pool }) => {
  if (!nama) throw new Error("Nama kategori wajib diisi!");
  const sql = `insert into ${table} (nama) values (?)`;
  const values = [nama];
  const [result] = await conn.execute(sql, values);
  return result.insertId;
};

const update = async ({ id, nama }) => {
  if (!nama) throw new Error("Nama kategori wajib diisi!");
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
