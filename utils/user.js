const connection = require("./db");

// bcrypt setup
// https://www.npmjs.com/package/bcrypt
const bcrypt = require("bcrypt");
const saltRounds = +process.env.SALT_ROUNDS;

const table = "user";

const login = ({ username, password }) => {
  const sql = `Select u.*, p.rank, p.keterangan keteranganperan From ${table} u 
  left join peran p on p.nama=u.peran 
  where username=?`;
  console.log(sql);
  const values = [username];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      console.log({ err });
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
      });
    });
  });
};

const list = ({ id = 0, peran = "", rank = "" }) => {
  const sql = `Select u.id, u.username, u.peran, u.id_karyawan, k.nama, p.rank, p.keterangan keteranganperan From ${table} u 
  left join karyawan k on k.id=u.id_karyawan 
  left join peran p on p.nama=u.peran 
  where 1=1${peran == "super" ? "" : " and (u.id=? or rank>?) "}
  order by username`;
  const values = [...(id ? [id] : []), ...(rank ? [rank] : [])];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ username, password, peran, id_karyawan }) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, function (err, hash) {
      // Store hash in your password DB.
      if (err) return reject(err);
      const sql = `insert into ${table} (username, password, peran, id_karyawan) values (?,'${hash}',?,?)`;
      const values = [username, peran, id_karyawan];
      connection.query(sql, values, (err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    });
  });
};

const update = ({
  id,
  username,
  password,
  peran,
  passwordlama,
  srcusername,
  srcperan,
  id_karyawan,
}) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `Select password From ${table} Where id=?`,
      [id],
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
          if (!result && srcperan != "super") {
            reject({ message: "Password lama tidak sesuai" });
            return;
          }
          bcrypt.hash(password, saltRounds, function (err, hash) {
            // Store hash in your password DB.
            if (err) return reject(err);
            const sql = `update ${table} set username=?, ${
              password ? `password='${hash}',` : ""
            } peran=?, id_karyawan=? where id=?`;
            const values = [username, peran, id_karyawan, id];
            connection.query(sql, values, (err, res) => {
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
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, destroy, login };
