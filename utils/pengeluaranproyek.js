const connection = require("./db");
const table = "pengeluaranproyek";

const list = ({ id_proyek, monthyear }) => {
  const sql = `Select pr.id id_proyek, pr.nama namaproyek, pr.instansi, pp.id id_pengeluaranproyek, pp.tanggal, pp.jumlah, pp.harga hargakustom, pp.status, pp.keterangan keteranganpp, k.nama namakaryawan, p.* From ${table} pp left join produk p on pp.id_produk = p.id left join karyawan k on pp.id_karyawan = k.id left join proyek pr on pp.id_proyek=pr.id where 1=1 ${
    id_proyek ? `and id_proyek=${id_proyek}` : ""
  } ${
    monthyear ? `and DATE_FORMAT(pp.tanggal, '%m-%Y') ='${monthyear}'` : ""
  } order by tanggal`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
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
    idproyek
      ? `(select id from proyek where id_second='${idproyek}')`
      : `'${id_proyek}'`
  }, '${tanggal}', ${
    karyawan
      ? `(select id from karyawan where nama='${karyawan}')`
      : `'${id_karyawan}'`
  }, ${
    idproduk
      ? `(select id from produk where id_kustom='${idproduk}')`
      : `'${id_produk}'`
  }, '${jumlah}', '${harga}', '${status}', '${keterangan}')`;
  console.log(sql);
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, tanggal, jumlah, harga, status, keterangan }) => {
  const sql = `update ${table} set tanggal = '${tanggal}', jumlah = '${jumlah}', harga = '${harga}', status = '${status}', keterangan = '${keterangan}' where id=${id}`;
  console.log({ sql });
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

module.exports = { list, create, update, destroy };
