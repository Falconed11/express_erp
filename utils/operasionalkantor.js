const connection = require("./db");
const table = "operasionalkantor";

const list = ({
  id_karyawan,
  id_kategorioperasionalkantor,
  tanggal,
  start,
  end,
  id_kategori,
}) => {
  const sql = `Select o.*, k.nama karyawan, ko.nama kategori from ${table} o left join karyawan k on o.id_karyawan = k.id left join kategorioperasionalkantor ko on o.id_kategorioperasionalkantor = ko.id where 1=1 ${
    id_karyawan ? `and id_karyawan=?` : ""
  } ${start ? `and tanggal>=?` : ""}
   ${end ? `and tanggal<=?` : ""} ${
    id_kategori ? `and id_kategorioperasionalkantor=?` : ""
  } order by o.tanggal desc`;
  const values = [];
  if (id_karyawan) values.push(id_karyawan);
  if (start) values.push(start);
  if (end) values.push(end);
  if (id_kategori) values.push(id_kategori);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id_karyawan,
  id_kategorioperasionalkantor,
  karyawan,
  kategori,
  biaya,
  tanggal,
  keterangan,
}) => {
  const values = [
    karyawan ?? id_karyawan,
    kategori ?? id_kategorioperasionalkantor,
    biaya,
    tanggal,
    keterangan,
  ];
  const sql = `insert into ${table} (id_karyawan, id_kategorioperasionalkantor, biaya, tanggal, keterangan) values (${
    karyawan ? `(select id from karyawan where nama=?)` : `?`
  }, ${
    kategori ? `(select id from kategorioperasionalkantor where nama=?)` : `?`
  }, ?, ?, ?)`;
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({
  id,
  id_karyawan,
  id_kategorioperasionalkantor,
  biaya,
  tanggal,
  keterangan,
}) => {
  const sql = `update ${table} set id_karyawan = ?, id_kategorioperasionalkantor = ?, biaya = ?, tanggal = ?, keterangan = ? where id = ?`;
  const values = [
    id_karyawan,
    id_kategorioperasionalkantor,
    biaya,
    tanggal,
    keterangan,
    id,
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  return new Promise((resolve, reject) => {
    connection.query(sql, [id], (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, destroy };
