const connection = require("./db");

// bcrypt setup
// https://www.npmjs.com/package/bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 10;

const table = "user";

const login = ({ username, password }) => {
  const sql = `Select * From ${table} Where username='${username}'`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (res.length == 0) {
        resolve({ message: "Username tidak ditemukan" });
        return;
      }
      const hash = res[0].password;
      bcrypt.compare(password, hash, function (err, result) {
        if (err) reject(err);
        if (result) {
          resolve(res[0]);
          return;
        }
        reject({ message: "Password salah" });
        console.log("Password salah");
      });
    });
  });
};

const list = () => {
  const sql = `Select id, username, peran From ${table}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ username, password, peran }) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, function (err, hash) {
      // Store hash in your password DB.
      if (err) return reject(err);
      const sql = `insert into ${table} (username, password, peran) values ('${username}','${hash}','${peran}')`;
      connection.query(sql, (err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    });
  });
};

const update = ({ id, username, password, peran, passwordlama }) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `Select password From ${table} Where id='${id}'`,
      (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        if (res.length == 0) {
          reject({ message: "Username tidak ditemukan" });
          return;
        }
        const hash = res[0].password;
        bcrypt.compare(passwordlama, hash, function (err, result) {
          if (err) {
            reject(err);
            return;
          }
          if (!result) {
            reject({ message: "Password lama tidak sesuai" });
            return;
          }
          console.log("Ini tetap jalan");
          bcrypt.hash(password, saltRounds, function (err, hash) {
            // Store hash in your password DB.
            if (err) return reject(err);
            const sql = `update ${table} set username='${username}', ${
              password ? `password='${hash}',` : ""
            } peran='${peran}' where id=${id}`;
            connection.query(sql, (err, res) => {
              if (err) reject(err);
              resolve(res);
            });
          });
        });
      }
    );
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

module.exports = { list, create, update, destroy, login };
