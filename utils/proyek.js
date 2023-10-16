const connection = require("./db");
const table = "proyek";
const list = ({ id }) => {
  const sql = `Select * From ${table} ${id ? `where id=${id}` : ""}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ nama, klien, status, keterangan }) => {
  const sql = `insert into ${table} (nama, klien, status, keterangan) values ('${nama}', '${klien}', '${status}', '${keterangan}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, nama, klien, status, keterangan }) => {
  const sql = `update ${table} set nama='${nama}', klien='${klien}', status='${status}', keterangan='${keterangan}' where id=${id}`;
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
