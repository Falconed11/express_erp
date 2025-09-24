const connection = require("./db.cjs");

const table = "kategoriproduk";

const list = () => {
  const sql = `Select * From ${table} order by nama`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      // if (!res) res = [];
      resolve(res);
    });
  });
};

const transfer = ({ currentId, targetId }) => {
  const sql = "update produk set id_ketegori = ? where id_ketegori = ?";
  const values = [targetId, currentId];
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
  const sql = `update ${table} set nama=? where id=?`;
  const values = [nama, id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, destroy, transfer };
