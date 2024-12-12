const connection = require("./db");
const table = "kwitansi";
const list = ({ id, start, end }) => {
  const sql = `Select k.*, b.nama nama_karyawan from ${table} k left join karyawan b on k.id_karyawan = b.id where 1=1 ${
    id ? `and id=?` : ""
  } ${start ? "and k.tanggal>=?" : ""} ${end ? `and k.tanggal<=?` : ""}`;
  const values = [];
  if (id) values.push(id);
  if (start) values.push(start);
  if (end) values.push(end);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id_kustom,
  nama_pembayar,
  nominal,
  keterangan,
  tanggal,
  id_karyawan,
}) => {
  const sql = `insert into ${table} (${
    id_kustom ?? "id_kustom,"
  } nama_pembayar, nominal, keterangan, tanggal, id_karyawan) values ( ${
    id_kustom ?? "?,"
  } ?,?,?,?,?)`;
  const values = [];
  if (id_kustom) values.push(id_kustom);
  values.push(nama_pembayar, nominal, keterangan, tanggal, id_karyawan);
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
  id_karyawan,
}) => {
  const sql = `update ${table} set ${
    id_kustom ?? `id_kustom=?,`
  } nama_pembayar=?, nominal=?, keterangan=?, tanggal=?, id_karyawan=? where id=?`;
  const values = [];
  if (id_kustom) values.push(id_kustom);
  values.push(nama_pembayar, nominal, keterangan, tanggal, id_karyawan, id);
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
