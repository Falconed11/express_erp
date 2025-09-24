const connection = require("./db.cjs");
require("dotenv").config();
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
  const isExist = (v) => v != null;
  const fields = [];
  const values = [];
  if (isExist(nama)) {
    fields.push("nama=?");
    values.push(nama);
  }
  if (isExist(logo)) {
    fields.push("logo=?");
    values.push(logo);
  }
  if (isExist(deskripsi)) {
    fields.push("deskripsi=?");
    values.push(deskripsi);
  }
  if (isExist(alamat)) {
    fields.push("alamat=?");
    values.push(alamat);
  }
  if (isExist(kontak)) {
    fields.push("kontak=?");
    values.push(kontak);
  }
  if (fields.length === 0)
    return Promise.resolve({ affectedRows: 0, message: "No fields to update" });
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
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
