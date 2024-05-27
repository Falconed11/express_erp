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

const list = ({ kategori, limit, nama }) => {
  if (nama) nama = "%" + nama + "%";
  const sql = `select kp.nama kategoriproduk, m.nama nmerek, v.nama nvendor, p.* from ${table} p left join merek m on p.id_merek=m.id left join vendor v on p.id_vendor=v.id left join kategoriproduk kp on p.id_kategori = kp.id where 1=1 ${
    kategori ? `and id_kategori = ?` : ""
  } ${nama ? "and p.nama like ?" : ""} order by kategori, nama, m.nama ${
    limit ? "limit ?" : ""
  }`;
  const values = [];
  if (kategori) values.push(kategori);
  if (nama) values.push(nama);
  if (limit) values.push(limit);
  console.log(values, sql);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
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
  id_kategori,
  id_kustom,
  nama,
  id_merek,
  tipe,
  id_vendor,
  stok,
  satuan,
  hargamodal,
  hargajual,
  keterangan,
}) => {
  const sql = `insert into ${table} (id_kategori, id_kustom, nama, id_merek, tipe, id_vendor, stok, satuan, hargamodal, hargajual, keterangan, manualinput) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`;
  return new Promise((resolve, reject) => {
    connection.query(
      sql,
      [
        id_kategori,
        id_kustom,
        nama,
        id_merek ?? 0,
        tipe,
        id_vendor ?? 0,
        stok,
        satuan,
        hargamodal,
        hargajual,
        keterangan ?? "",
      ],
      (err, res) => {
        if (err) reject(err);
        resolve(res);
      }
    );
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
  id_kategori,
  nama,
  id_merek,
  tipe,
  id_vendor,
  stok,
  satuan,
  hargamodal,
  hargajual,
  keterangan,
}) => {
  const sql = `update ${table} set id_kategori=?, id_kustom=?, nama=?, id_merek=?, tipe=?, id_vendor=?, stok=?, satuan=?, hargamodal=?, hargajual=?, keterangan=? where id=?`;
  return new Promise((resolve, reject) => {
    connection.query(
      sql,
      [
        id_kategori,
        id_kustom,
        nama,
        id_merek,
        tipe,
        id_vendor,
        stok,
        satuan,
        hargamodal,
        hargajual,
        keterangan,
        id,
      ],
      (err, res) => {
        if (err) reject(err);
        resolve(res);
      }
    );
  });
};
const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  return new Promise((resolve, reject) => {
    connection.query(sql, [id], (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, destroy, listKategori };
