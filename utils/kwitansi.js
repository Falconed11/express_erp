const connection = require("./db");
const table = "kwitansi";
const list = ({ id }) => {
  const sql = `Select * from ${table} ${id ? `where id=${id}` : ""}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ id_kustom, nama_pembayar, nominal, keterangan, tanggal }) => {
  const sql = `insert into ${table} (${
    id_kustom ?? "id_kustom,"
  } nama_pembayar, nominal, keterangan, tanggal) values ( ${
    id_kustom ?? "?,"
  } ?,?,?,?)`;
  const values = [];
  if (id_kustom) values.push(id_kustom);
  values.push(nama_pembayar, nominal, keterangan, tanggal);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({
  id,
  id_kustom,
  nama_pembayar,
  nominal,
  keterangan,
  tanggal,
}) => {
  const sql = `update ${table} set ${
    id_kustom ?? `id_kustom=?,`
  } nama_pembayar=?, nominal=?, keterangan=?, tanggal=? where id=?`;
  const values = [];
  if (id_kustom) values.push(id_kustom);
  values.push(nama_pembayar, nominal, keterangan, tanggal, id);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
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

module.exports = { list, create, update, destroy };
