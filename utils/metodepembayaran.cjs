const connection = require("./db.cjs");

const table = "metodepembayaran";

const list = ({ id }) => {
  const sql = `select b.nama namabank, mp.id, mp.*, t.t total from ${table} mp 
  left join (select mp.id, mp.nama, sum(pp.nominal) t from pembayaranproyek pp left join metodepembayaran mp on 
    pp.id_metodepembayaran=mp.id group by mp.id) t on mp.id=t.id 
  left join bank b on b.id=mp.id_bank 
  where 1=1 ${id ? "and mp.id=?" : ""} order by mp.nama`;
  const values = [];
  if (id) values.push(id);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const total = () => {
  const sql = `select mp.id, mp.nama, sum(pp.nominal) total from pembayaranproyek pp left join metodepembayaran mp on pp.id_metodepembayaran=mp.id group by mp.id order by mp.nama`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const transferBank = ({ src, dst }) => {
  const sql =
    "update pembayaranproyek set id_metodepembayaran=? where id_metodepembayaran=?";
  const values = [dst, src];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const create = ({ nama, id_bank, norekening, atasnama }) => {
  const sql = `insert into ${table} (nama,id_bank,norekening,atasnama) values (?,?,?,?)`;
  const values = [nama, id_bank, norekening, atasnama];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, nama, id_bank, norekening, atasnama }) => {
  const sql = `update ${table} set nama=?, id_bank=?, norekening=?, atasnama=? where id=?`;
  const values = [nama, id_bank, norekening, atasnama, id];
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

module.exports = { list, create, update, destroy, total, transferBank };
