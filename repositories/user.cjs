const { pool } = require("./db.2.0.0.cjs");
require("dotenv").config();
// bcrypt setup
// https://www.npmjs.com/package/bcrypt
const bcrypt = require("bcrypt");
const saltRounds = +process.env.SALT_ROUNDS;

const table = "user";

const SUPER_ROLE = "super";
const MAX_RANK = 10;

const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, function (err, hash) {
      if (err) reject(err);
      resolve(hash);
    });
  });
};

const login = async ({ username, password }) => {
  const sql = `Select u.*, p.rank, p.keterangan keteranganperan, k.nama From ${table} u 
  left join peran p on p.nama=u.peran
  left join karyawan k on k.id=u.id_karyawan
  where username=?`;
  const values = [username];

  const [rows] = await pool.execute(sql, values);
  if (rows.length === 0) {
    throw new Error("Username tidak ditemukan");
  }

  const hash = rows[0].password;
  const result = await bcrypt.compare(password, hash);
  if (!result) {
    throw new Error("Password salah");
  }

  return rows[0];
};

const list = async ({ id = 0, peran = "", rank = "" }) => {
  const sql = `Select u.id, u.username, u.peran, u.id_karyawan, k.nama, p.rank, p.keterangan keteranganperan From ${table} u 
  left join karyawan k on k.id=u.id_karyawan 
  left join peran p on p.nama=u.peran 
  where 1=1${
    peran == SUPER_ROLE
      ? ""
      : ` and (u.id=?${rank && rank <= MAX_RANK ? " or rank>?" : ""}) `
  }
  order by username`;
  const values = [...(id ? [id] : []), ...(rank ? [rank] : [])];

  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({ username, password, peran, id_karyawan }) => {
  const hash = await hashPassword(password);
  const sql = `insert into ${table} (username, password, peran, id_karyawan) values (?,?,?,?)`;
  const values = [username, hash, peran, id_karyawan];

  const [result] = await pool.execute(sql, values);
  return result;
};

const update = async ({
  id,
  username,
  password,
  peran,
  passwordlama,
  srcusername,
  srcperan,
  id_karyawan,
}) => {
  const [rows] = await pool.execute(
    `Select password From ${table} Where id=?`,
    [id],
  );
  if (rows.length === 0) {
    throw new Error("Username tidak ditemukan");
  }

  const oldHash = rows[0].password;
  const oldPasswordMatches = await bcrypt.compare(passwordlama, oldHash);
  if (!oldPasswordMatches && srcperan != SUPER_ROLE) {
    throw new Error("Password lama tidak sesuai");
  }

  if (password) {
    const newHash = await hashPassword(password);
    const sql = `update ${table} set username=?, password=?, peran=?, id_karyawan=? where id=?`;
    const values = [username, newHash, peran, id_karyawan, id];
    const [result] = await pool.execute(sql, values);
    return result;
  }

  const sql = `update ${table} set username=?, peran=?, id_karyawan=? where id=?`;
  const values = [username, peran, id_karyawan, id];
  const [result] = await pool.execute(sql, values);
  return result;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [result] = await pool.execute(sql, values);
  return result;
};

module.exports = { list, create, update, destroy, login };
