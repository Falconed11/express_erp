const connection = require("./db");

const table = "bank";

const list = () => {
  const sql = `select * from ${table} limit 100`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const total = () => {
  const sql = `select mp.id, mp.nama, sum(pp.nominal) total from pembayaranproyek pp left join metodepembayaran mp on pp.id_metodepembayaran=mp.id group by mp.id order by mp.nama`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
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

module.exports = { list, create, update, destroy, total };
