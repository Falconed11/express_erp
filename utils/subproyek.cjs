const connection = require("./db.cjs");
const table = "subproyek";

const list = ({ id_proyek }) => {
  const sql = `Select * From ${table} where 1=1${
    id_proyek ? ` and id_proyek=?` : ""
  };`;
  const val = [id_proyek];
  return new Promise((resolve, reject) => {
    connection.query(sql, val, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ id_proyek, nama }) => {
  const sql = `insert into ${table} (id_proyek, nama) values (?,?)`;
  const val = [id_proyek, nama];
  console.log(val);
  return new Promise((resolve, reject) => {
    connection.query(sql, val, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, id_proyek, nama }) => {
  const sql = `update ${table} set id_proyek=?, nama=? where id=?`;
  const val = [id_proyek, nama, id];
  return new Promise((resolve, reject) => {
    connection.query(sql, val, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const val = [id];
  return new Promise((resolve, reject) => {
    connection.query(sql, val, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, destroy };
