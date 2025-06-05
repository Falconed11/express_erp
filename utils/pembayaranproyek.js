const connection = require("./db");
const table = "pembayaranproyek";

const list = ({ id_proyek, id_metodepembayaran, monthyear, start, end }) => {
  const sql = `Select p.id id_proyek, p.nama, i.nama instansi, mp.nama metodepembayaran, pp.* from ${table} pp 
  left join proyek p on pp.id_proyek=p.id 
  left join metodepembayaran mp on pp.id_metodepembayaran=mp.id 
  left join instansi i on p.id_instansi=i.id where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } ${monthyear ? `and DATE_FORMAT(tanggal, '%m-%Y')=?` : ""} ${
    start ? `and pp.tanggal>=?` : ""
  } ${end ? `and pp.tanggal<=?` : ""} ${
    id_metodepembayaran ? "and id_metodepembayaran=?" : ""
  } order by pp.tanggal desc`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  if (start) values.push(start);
  if (end) values.push(end);
  if (id_metodepembayaran) values.push(id_metodepembayaran);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) console.log(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const total = ({ id_proyek, monthyear }) => {
  const sql = `Select sum(nominal) total from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } ${monthyear ? `and DATE_FORMAT(tanggal, '%m-%Y')=?` : ""}`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id_proyek,
  idproyek,
  nominal,
  id_metodepembayaran,
  tanggal,
  keterangan,
}) => {
  const sql = `insert into ${table} (id_proyek, nominal, id_metodepembayaran, tanggal, keterangan) values (${
    idproyek ? `(select id from proyek where id_second=?)` : `?`
  }, ?, ?, ?, ?)`;
  const values = [
    idproyek ?? id_proyek,
    nominal,
    id_metodepembayaran,
    tanggal,
    keterangan ?? "",
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({
  id,
  id_proyek,
  nominal,
  id_metodepembayaran,
  tanggal,
  keterangan,
}) => {
  const sql = `update ${table} set id_proyek = ?, nominal = ?, id_metodepembayaran = ?, tanggal = ?, keterangan = ? where id=?`;
  const values = [
    id_proyek,
    nominal,
    id_metodepembayaran,
    tanggal,
    keterangan,
    id,
  ];
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

module.exports = { list, create, update, destroy, total };
