const { pool } = require("./db.2.0.0.cjs");

const table = "kategorioperasionalkantor";

const list = async () => {
  const sql = `Select k.*, coalesce(sum(biaya),0) totalbiaya, coalesce(count(biaya),0) totaltransaksi from ${table} k
  left join operasionalkantor o on o.id_kategorioperasionalkantor=k.id
  group by k.id
  order by k.nama`;
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

const transfer = async ({ id, newId }) => {
  if (!id) throw new Error("Id lama wajib diisi!");
  if (!newId) throw new Error("Id baru wajib diisi!");
  const field = "id_kategorioperasionalkantor";
  try {
    const sql = `update operasionalkantor set ${field}= ? where ${field} = ?`;
    const values = [newId, id];
    const [res] = await pool.execute(sql, values);
    return res;
  } catch (err) {
    console.error("Query error: ", err);
    throw err;
  }
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [res] = await pool.execute(sql, values);
  return res;
};

module.exports = { list, create, update, transfer, destroy };
