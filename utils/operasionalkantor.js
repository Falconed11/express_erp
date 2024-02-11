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
    id_karyawan ? `and id_proyek=${id_karyawan}` : ""
  } ${start ? `and tanggal>='${start}'` : ""} ${
    start ? `and tanggal>='${start}'` : ""
  } ${end ? `and tanggal<='${end}'` : ""} ${
    id_kategori ? `and id_kategorioperasionalkantor=${id_kategori}` : ""
  }`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
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
  const sql = `insert into ${table} (id_karyawan, id_kategorioperasionalkantor, biaya, tanggal, keterangan) values (${
    karyawan
      ? `(select id from karyawan where nama='${karyawan}')`
      : `'${id_karyawan}'`
  }, ${
    kategori
      ? `(select id from kategorioperasionalkantor where nama='${kategori}')`
      : `'${id_kategorioperasionalkantor}'`
  }, '${biaya}', '${tanggal}', '${keterangan}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
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
  const sql = `update ${table} set id_karyawan = '${id_karyawan}', id_kategorioperasionalkantor = '${id_kategorioperasionalkantor}', biaya = '${biaya}', tanggal = '${tanggal}', keterangan = '${keterangan}' where id=${id}`;
  console.log({ sql });
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

module.exports = { list, create, update, destroy };
