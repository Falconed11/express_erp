const connection = require("./db");
const table = "pengeluaranproyek";

const list = ({ id_proyek, monthyear, start, end }) => {
  const sql = `Select pr.id id_proyek, pr.nama namaproyek, pr.instansi, pp.id id_pengeluaranproyek, pp.tanggal tanggalpengeluaran, pp.jumlah, pp.harga hargapengeluaran, pp.status, pp.keterangan keteranganpp, k.nama namakaryawan, p.* From ${table} pp left join produk p on pp.id_produk = p.id left join karyawan k on pp.id_karyawan = k.id left join proyek pr on pp.id_proyek=pr.id where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } ${monthyear ? `and DATE_FORMAT(pp.tanggal, '%m-%Y') =?` : ""} ${
    start ? `and pp.tanggal>=?` : ""
  } ${end ? `and pp.tanggal<=?` : ""} order by pp.tanggal desc`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  if (start) values.push(start);
  if (end) values.push(end);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) console.log(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id_proyek,
  idproyek,
  tanggal,
  id_karyawan,
  karyawan,
  id_produk,
  idproduk,
  jumlah,
  harga,
  status,
  keterangan,
}) => {
  const sql = `insert into ${table} (id_proyek, tanggal, id_karyawan, id_produk, jumlah, harga, status, keterangan) values (${
    idproyek ? `(select id from proyek where id_second=?)` : `?`
  }, ?, ${karyawan ? `(select id from karyawan where nama=?)` : `?`}, ${
    idproduk ? `(select id from produk where id_kustom=?)` : `?`
  }, ?, ?, ?, ?)`;
  const values = [
    idproyek ?? id_proyek,
    tanggal,
    karyawan ?? id_karyawan,
    idproduk ?? id_produk ?? "",
    jumlah,
    harga ?? 0,
    status ?? "",
    keterangan ?? "",
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, tanggal, jumlah, harga, status, keterangan }) => {
  const sql = `update ${table} set tanggal = ?, jumlah = ?, harga = ?, status = ?, keterangan = ? where id=?`;
  const values = [tanggal, jumlah, harga, status, keterangan, id];
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
