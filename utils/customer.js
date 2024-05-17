const connection = require("./db");

const table = "instansi";

const list = ({ limit }) => {
  const pembayaran = `select id_instansi id, sum(nominal) pembayaran from pembayaranproyek pp left join proyek p on pp.id_proyek=p.id group by id_instansi`;
  const produksi = `select id_instansi id, sum(jumlah*harga) produksi from pengeluaranproyek pp left join proyek p on pp.id_proyek=p.id group by id`;
  const sql = `select i.id, i.nama, (pm.pembayaran-p.produksi) provit from ${table} i left join (${pembayaran}) pm on i.id=pm.id left join (${produksi}) p on i.id=p.id order by provit ${
    limit ? "limit ?" : ""
  }`;
  const values = [];
  if (limit) values.push(limit);
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const pembayaran = () => {
  const sql = `select id_instansi id, sum(nominal) from pembayaranproyek pp left join proyek p on pp.id_proyek=p.id group by id_instansi`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const produksi = () => {
  const sql = `select id_instansi id, sum(jumlah*harga) produksi from pengeluaranproyek pp left join proyek p on pp.id_proyek=p.id group by id`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const transfer = ({ currentId, targetId }) => {
  const sql = "update produk set id_vendor = ? where id_vendor = ?";
  const values = [targetId, currentId];
  console.log(values);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const create = ({ nama, alamat }) => {
  const sql = `insert into ${table} (nama, alamat) values ('${nama}','${alamat}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, nama, alamat }) => {
  const sql = `update ${table} set nama='${nama}', alamat='${alamat}' where id=${id}`;
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

module.exports = { list, create, update, destroy, transfer };
