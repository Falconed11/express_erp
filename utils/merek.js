const connection = require("./db");

const table = "merek";

const list = () => {
  const sql = `Select * From ${table} order by nama`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const transfer = ({ currentId, targetId }) => {
  const sql = "update produk set id_merek = ? where id_merek = ?";
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
      console.log(err);
      resolve(res);
    });
  });
};

const update = ({ id, nama }) => {
  const sql = `update ${table} set nama=? where id=?`;
  values = [nama, id];
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
