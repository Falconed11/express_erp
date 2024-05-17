const connection = require("./db");

const table = "vendor";

const list = ({ limit }) => {
  const sql = `select * from vendor ${limit ? "limit ?" : ""}`;
  const values = [];
  if (limit) values.push(limit);
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const hutang = () => {
  const sql = `select v.id, v.nama, h.hutang, v.alamat from vendor v LEFT JOIN (select v.id,v.nama,sum(pp.jumlah*pp.harga) hutang from pengeluaranproyek pp left join produk p on pp.id_produk = p.id LEFT JOIN vendor v on p.id_vendor=v.id where lunas=0 group by p.id_vendor) h on v.id=h.id order by v.nama`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const transfer = ({ currentId, targetId }) => {
  const sql = "update produk set id_vendor = ? where id_vendor = ?";
  const values = [targetId, currentId];
  console.log(values);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const create = ({ nama, alamat }) => {
  const sql = `insert into ${table} (nama, alamat) values ('${nama}','${alamat}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, nama, alamat }) => {
  const sql = `update ${table} set nama='${nama}', alamat='${alamat}' where id=${id}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ${id}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, destroy, hutang, transfer };
