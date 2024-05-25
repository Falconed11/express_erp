const connection = require("./db");

const table = "instansi";

const list = ({ limit }) => {
  const pembayaran = `select id_instansi id, sum(nominal) pembayaran from pembayaranproyek pp left join proyek p on pp.id_proyek=p.id group by id_instansi`;
  const produksi = `select id_instansi id, sum(jumlah*harga) produksi, count(*) jumlah_proyek from pengeluaranproyek pp left join proyek p on pp.id_proyek=p.id group by id`;
  const sql = `select i.kota, i.id, i.nama, i.alamat, coalesce((pm.pembayaran-p.produksi),0) provit, coalesce(jumlah_proyek,0) jumlah_proyek from ${table} i left join (${pembayaran}) pm on i.id=pm.id left join (${produksi}) p on i.id=p.id order by nama ${
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
  const sql = "update proyek set id_instansi = ? where id_instansi = ?";
  const values = [targetId, currentId];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const create = ({ nama, alamat }) => {
  const sql = `insert into ${table} (nama, alamat) values (?,?)`;
  const values = [nama, alamat];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, nama, alamat }) => {
  const sql = `update ${table} set nama=?, alamat=? where id=?`;
  const values = [nama, alamat, id];
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

module.exports = { list, create, update, destroy, transfer };
