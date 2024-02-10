const connection = require("./db");

const table = "produk";

// const list = () => {
//   const sql = `Select p.*, s.nama as subkategori, k.nama as kategori, m.nama as merek From ${table} p
//   left join subkategoriproduk s on p.id_subkategori = s.id
//   left join kategoriproduk k on p.id_kategori = k.id
//   left join merek m on p.id_merek = m.id`;
//   return new Promise((resolve, reject) => {
//     connection.query(sql, (err, res) => {
//       if (!res) res = [];
//       resolve(res);
//     });
//   });
// };

const list = ({ kategori }) => {
  const sql = `select * from ${table} ${
    kategori ? `where kategori = '${kategori}'` : ""
  } order by kategori, nama, merek`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const listKategori = () => {
  const sql = `select distinct kategori from ${table}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

// const create = ({
//   nama,
//   id_kategori,
//   id_subkategori,
//   id_merek,
//   tipe,
//   jumlah,
//   satuan,
//   keterangan,
// }) => {
//   const sql = `insert into ${table} (nama, id_kategori, id_subkategori, id_merek, tipe, jumlah, satuan, keterangan) values ('${nama}', '${id_kategori}', '${id_subkategori}', '${id_merek}', '${tipe}', '${jumlah}', '${satuan}', '${keterangan}')`;
//   return new Promise((resolve, reject) => {
//     connection.query(sql, (err, res) => {
//       if (err) reject(err);
//       resolve(res);
//     });
//   });
// };

const create = ({
  kategori,
  id_kustom,
  nama,
  merek,
  tipe,
  vendor,
  stok,
  satuan,
  hargamodal,
  hargajual,
  keterangan,
}) => {
  const sql = `insert into ${table} (kategori, id_kustom, nama, merek, tipe, vendor, stok, satuan, hargamodal, hargajual, keterangan) values ('${kategori}', '${id_kustom}', '${nama}', '${merek}', '${tipe}', '${vendor}', '${stok}', '${satuan}', '${hargamodal}', '${hargajual}', '${keterangan}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

// const update = ({
//   id,
//   nama,
//   id_kategori,
//   id_subkategori,
//   id_merek,
//   tipe,
//   jumlah,
//   satuan,
//   keterangan,
// }) => {
//   const sql = `update ${table} set nama='${nama}', id_kategori='${id_kategori}', id_subkategori='${id_subkategori}', id_merek='${id_merek}', tipe='${tipe}', jumlah='${jumlah}', satuan='${satuan}', keterangan='${keterangan}' where id=${id}`;
//   return new Promise((resolve, reject) => {
//     connection.query(sql, (err, res) => {
//       if (err) reject(err);
//       resolve(res);
//     });
//   });
// };

const update = ({
  id,
  id_kustom,
  kategori,
  nama,
  merek,
  tipe,
  vendor,
  stok,
  satuan,
  hargamodal,
  hargajual,
  keterangan,
}) => {
  const sql = `update ${table} set kategori='${kategori}', id_kustom='${id_kustom}', nama='${nama}', merek='${merek}', tipe='${tipe}', vendor='${vendor}', stok='${stok}', satuan='${satuan}', hargamodal='${hargamodal}', hargajual='${hargajual}', keterangan='${keterangan}' where id=${id}`;
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

module.exports = { list, create, update, destroy, listKategori };
