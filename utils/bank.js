const connection = require("./db");

const table = "metodepembayaran";

const list = () => {
  const sql = `select mp.id, mp.nama, t.t total from ${table} mp left join (select mp.id, mp.nama, sum(pp.nominal) t from pembayaranproyek pp left join metodepembayaran mp on pp.id_metodepembayaran=mp.id group by mp.id) t on mp.id=t.id order by mp.nama`;
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

const transferBank = ({ src, dst }) => {
  const sql =
    "update pembayaranproyek set id_metodepembayaran=? where id_metodepembayaran=?";
  const values = [dst, src];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const create = ({ nama }) => {
  const sql = `insert into ${table} (nama) values (?)`;
  const values = [nama];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, nama }) => {
  const sql = `update ${table} set nama='${nama}' where id=${id}`;
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

module.exports = { list, create, update, destroy, total, transferBank };
