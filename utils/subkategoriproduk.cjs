const connection = require("./db.cjs");

const table = "subkategoriproduk";

const list = () => {
  const sql = `Select ${table}.*, kategoriproduk.nama as kategori From ${table} left join kategoriproduk on ${table}.id_kategoriproduk = kategoriproduk.id`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ id_kategoriproduk, nama }) => {
  const sql = `insert into ${table} (id_kategoriproduk, nama) values ('${id_kategoriproduk}', '${nama}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, id_kategoriproduk, nama }) => {
  const sql = `update ${table} set id_kategoriproduk='${id_kategoriproduk}', nama='${nama}' where id=${id}`;
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
