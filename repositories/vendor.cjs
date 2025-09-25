const { pool } = require("./db.2.0.0.cjs");
const table = "vendor";

const list = async ({ id, limit, columnName, sortOrder }) => {
  validColumns = ["nama"];
  // if (!Number.isInteger(limit) || limit <= 0) {
  //   return Promise.reject(new Error("Invalid limit value"));
  // }
  if (columnName)
    if (!validColumns.includes(columnName)) {
      throw new Error("Nama kolom tidak valid");
    }
  sortOrder = sortOrder ? "desc" : "asc";
  const sql = `select * from vendor where 1=1 ${id ? `and id=?` : ""} ${
    columnName ? ` order by ? ${sortOrder}` : ""
  } ${limit ? "limit 0, ?" : ""}`;
  const values = [];
  if (id) values.push(id);
  if (columnName) values.push(columnName);
  if (limit) values.push(+limit);
  const [result] = await pool.execute(sql, values);
  return result;
};

const hutang = async () => {
  const sql = `select v.id, v.nama, h.hutang, v.alamat from vendor v LEFT JOIN (select v.id,v.nama,sum(pp.jumlah*pp.harga) hutang from pengeluaranproyek pp left join produk p on pp.id_produk = p.id LEFT JOIN vendor v on p.id_vendor=v.id where lunas=0 group by p.id_vendor) h on v.id=h.id order by v.nama`;
  const [result] = await pool.execute(sql);
  return result;
};

const transfer = async ({ currentId, targetId }) => {
  const sql = "update produk set id_vendor = ? where id_vendor = ?";
  const values = [targetId, currentId];
  const [result] = await pool.execute(sql, values);
  return result;
};

const create = async ({ nama, alamat = "" }) => {
  if (!nama) throw new Error("Nama wajib diisi!");
  const sql = `insert into ${table} (nama, alamat) values (?,?)`;
  const values = [nama, alamat];
  const [result] = await pool.execute(sql, values);
  return result;
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
