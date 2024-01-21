const connection = require("./db");
const table = "pembayaranproyek";

const list = ({ id_proyek }) => {
  const sql = `Select * from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=${id_proyek}` : ""
  }`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ id_proyek, nominal, carabayar, tanggal, keterangan }) => {
  const sql = `insert into ${table} (id_proyek, nominal, carabayar, tanggal, keterangan) values ('${id_proyek}', '${nominal}', '${carabayar}', '${tanggal}', '${keterangan}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, id_proyek, nominal, carabayar, tanggal, keterangan }) => {
  const sql = `update ${table} set id_proyek = '${id_proyek}', nominal = '${nominal}', carabayar = '${carabayar}', tanggal = '${tanggal}', keterangan = '${keterangan}' where id=${id}`;
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
