const connection = require("./db");
const table = "aruskasproyek";

const list = ({ id_proyek }) => {
  const sql = `Select a.id id_aruskasproyek, a.tanggal, a.jumlah, a.harga hargakustom, a.status, a.keterangan keteranganakp, k.nama namakaryawan, p.* From ${table} a left join produk p on a.id_produk = p.id left join karyawan k on a.id_karyawan = k.id where 1=1 ${
    id_proyek ? `and id_proyek=${id_proyek}` : ""
  }`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id_proyek,
  tanggal,
  id_karyawan,
  id_produk,
  jumlah,
  harga,
  status,
  keterangan,
}) => {
  const sql = `insert into ${table} (id_proyek, tanggal, id_karyawan, id_produk, jumlah, harga, status, keterangan) values ('${id_proyek}', '${tanggal}', '${id_karyawan}', '${id_produk}', '${jumlah}', '${harga}', '${status}', '${keterangan}')`;
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
