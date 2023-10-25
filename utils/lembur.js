const connection = require("./db");

const table = "lembur";

const list = () => {
  const sql = `Select * From ${table}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id_karyawan,
  id_proyek,
  durasi,
  harga,
  keterangan,
  tanggal,
}) => {
  const sql = `insert into ${table} (id_karyawan, id_proyek, durasi ,harga, keterangan, tanggal) values ('${id_karyawan}','${id_proyek}','${durasi}','${harga}','${keterangan}','${tanggal}')`;
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
  id_proyek,
  durasi,
  harga,
  keterangan,
  tanggal,
}) => {
  const sql = `update ${table} set id_karyawan='${id_karyawan}', id_proyek='${id_proyek}', durasi='${durasi}', tanggal='${tanggal}', harga='${harga}', keterangan='${keterangan}' where id=${id}`;
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
