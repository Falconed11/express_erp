const { withTransaction } = require("../helpers/transaction.cjs");
const { pool } = require("./db.2.0.0.cjs");
const table = "vendor";

const list = async ({ id, limit, columnName, sortOrder = "" }) => {
  validColumns = ["nama"];
  // if (!Number.isInteger(limit) || limit <= 0) {
  //   return Promise.reject(new Error("Invalid limit value"));
  // }
  if (columnName && !validColumns.includes(columnName))
    throw new Error("Nama kolom tidak valid");
  sortOrder = sortOrder ? "desc" : "asc";
  const sql = `select v.*, sum(p.jumlah) nprodukkeluar, sum(pm.jumlah) nprodukmasuk from ${table} v
  left join pengeluaranproyek p on p.id_vendor=v.id
  left join produkmasuk pm on pm.id_vendor=v.id
  where 1=1 ${id ? `and v.id=?` : ""}
  group by v.id
  ${columnName ? ` order by ${columnName} ${sortOrder} , v.id` : ""} ${
    limit ? "limit 0, ?" : ""
  }`;
  console.log(sql);
  const values = [];
  if (id) values.push(id);
  if (limit) values.push(+limit);
  const [result] = await pool.execute(sql, values);
  return result;
};

const hutang = async () => {
  const sql = `select v.id, v.nama, h.hutang, v.alamat from vendor v LEFT JOIN (select v.id,v.nama,sum(pp.jumlah*pp.harga) hutang from pengeluaranproyek pp left join produk p on pp.id_produk = p.id LEFT JOIN vendor v on p.id_vendor=v.id where lunas=0 group by p.id_vendor) h on v.id=h.id order by v.nama`;
  const [result] = await pool.execute(sql);
  return result;
};

const transfer = async ({ id, newId }) => {
  try {
    const result = await withTransaction(pool, async (conn) => {
      const acc = {};
      const values = [newId, id];
      let sql = "UPDATE produkmasuk SET id_vendor = ? WHERE id_vendor = ?";
      const [produkmasukRes] = await conn.execute(sql, values);
      acc.produkmasuk = produkmasukRes;
      sql = "UPDATE pengeluaranproyek SET id_vendor = ? WHERE id_vendor = ?";
      const [pengeluaranproyekRes] = await conn.execute(sql, values);
      acc.pengeluaranproyek = pengeluaranproyekRes;
      return acc;
    });
    return result;
  } catch (err) {
    console.error("Transaction Error:", err.message || err);
    throw err;
  }
};

const create = async ({ nama, alamat = "", conn = pool }) => {
  if (!nama) throw new Error("Nama wajib diisi!");
  const sql = `insert into ${table} (nama, alamat) values (?,?)`;
  const values = [nama, alamat];
  const [result] = await conn.execute(sql, values);
  return result.insertId;
};

const update = async ({ id, nama, alamat = "" }) => {
  if (!nama) throw new Error("Nama wajib diisi!");
  const sql = `update ${table} set nama=?, alamat=? where id=?`;
  const values = [nama, alamat, id];
  const [result] = await pool.execute(sql, values);
  return result;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [result] = await pool.execute(sql, values);
  return result;
};

module.exports = { list, create, update, destroy, hutang, transfer };
