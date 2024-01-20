const connection = require("./db");
const table = "nota";
const list = ({ id }) => {
  const sql = `Select n.*, k.nama namakaryawan from ${table} n left join karyawan k on n.id_karyawan = k.id ${
    id ? `where n.id=${id}` : ""
  }`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ user, instansi, tanggal, id_karyawan }) => {
  let sql = `select id_kustom from ${table} where DATE_FORMAT(tanggal, '%Y') = DATE_FORMAT('${tanggal}', '%Y') order by id_kustom desc limit 1`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      let id_kustom = 1;
      if (res.length > 0) {
        id_kustom = res[0].id_kustom + 1;
      }
      sql = `insert into ${table} (id_kustom, user, instansi, tanggal, id_karyawan) values ('${id_kustom}', '${user}', '${instansi}', '${tanggal}', '${id_karyawan}')`;
      connection.query(sql, (err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    });
  });
};

const update = ({ id, user, instansi, tanggal, id_karyawan }) => {
  const sql = `update ${table} set user='${user}', instansi='${instansi}', tanggal='${tanggal}', id_karyawan='${id_karyawan}' where id=${id}`;
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
