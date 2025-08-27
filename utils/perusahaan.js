const connection = require("./db");

const table = "perusahaan";

const list = ({ id }) => {
  const sql = `select *, concat('${
    process.env.MAIN_URL
  }logo/', logo) logo from ${table} where 1=1${id ? ` and id=?` : ""}`;
  const values = [...(id ? [id] : [])];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      console.log(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ nama, logo, deskripsi, alamat, kontak }) => {
  const sql = `insert into ${table} (nama,logo,deskripsi,alamat,kontak) values (?,?,?,?,?)`;
  const values = [nama, logo, deskripsi, alamat, kontak];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, nama, logo, deskripsi, alamat, kontak }) => {
  const sql = `update ${table} set nama=?, logo=?, deskripsi=?, alamat=?, kontak=? where id=?`;
  const values = [nama, logo, deskripsi, alamat, kontak, id];
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

module.exports = { list, create, update, destroy };
