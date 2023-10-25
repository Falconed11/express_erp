const connection = require("./db");

const table = "pengeluaranperusahaan";

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
  id_distributor,
  id_kategori,
  nominal,
  tanggal,
  keterangan,
}) => {
  const sql = `insert into ${table} (id_distributor, id_kategori, nominal, tanggal, keterangan) values ('${id_distributor}','${id_kategori}','${nominal}','${tanggal}','${keterangan}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({
  id,
  id_distributor,
  id_kategori,
  nominal,
  tanggal,
  keterangan,
}) => {
  const sql = `update ${table} set id_distributor='${id_distributor}', id_kategori='${id_kategori}' , nominal='${nominal}' , tanggal='${tanggal}' , keterangan='${keterangan}' where id=${id}`;
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
