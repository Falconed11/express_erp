const connection = require("./db");
const table = "keranjangproyek";

// const list = ({ id_proyek }) => {
//   const qcol = id_proyek
//     ? `k.harga as hargajual, k.id as id_keranjangproyek, k.jumlah as jumlah, s.id as id_stok, s.jumlah as stok, s.harga as hargabeli, p.nama, p.satuan, p.tipe, kp.nama as kategori, sk.nama as subkategori, m.nama as merek`
//     : "*";
//   const qid_proyek = id_proyek ? `id_proyek = ${id_proyek}` : "";
//   const qleft_join = id_proyek
//     ? `left join stok s on k.id_stok = s.id
//     left join produk p on s.id_produk = p.id
//     left join kategoriproduk kp on p.id_kategori = kp.id
//     left join subkategoriproduk sk on p.id_subkategori = sk.id
//     left join merek m on p.id_merek = m.id`
//     : "";
//   const where = id_proyek ? "where" : "";
//   const sql = `Select ${qcol} From ${table} k ${qleft_join} ${where} ${qid_proyek}`;
//   return new Promise((resolve, reject) => {
//     connection.query(sql, (err, res) => {
//       if (!res) res = [];
//       resolve(res);
//     });
//   });
// };
const list = ({ id_proyek, instalasi, versi }) => {
  const sql = `Select kpr.nama kategoriproduk, kp.id id_keranjangproyek, kp.jumlah, kp.harga, kp.hargakustom, m.nama nmerek, v.nama nvendor, p.nama, p.stok, p.tipe, p.hargamodal From ${table} kp left join produk p on kp.id_produk = p.id left join kategoriproduk kpr on p.id_kategori=kpr.id left join merek m on p.id_merek=m.id left join vendor v on p.id_vendor=v.id where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } ${instalasi ? `and instalasi = ?` : ""} and versi=?`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (instalasi) values.push(instalasi);
  values.push(versi);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const listVersion = ({ id_proyek }) => {
  const sql = `select distinct versi from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  }`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

// const create = ({ id_stok, id_proyek, jumlah, harga }) => {
//   const sql = `insert into ${table} (id_stok, id_proyek, jumlah, harga) values ('${id_stok}', '${id_proyek}', '${jumlah}', '${harga}')`;
//   return new Promise((resolve, reject) => {
//     connection.query(sql, (err, res) => {
//       if (err) reject(err);
//       resolve(res);
//     });
//   });
// };

const create = ({
  id_produk,
  id_proyek,
  jumlah,
  harga,
  hargakustom,
  instalasi,
  versi,
}) => {
  if (!jumlah)
    return new Promise((resolve, reject) =>
      reject({ message: `Jumlah Belum Diisi` })
    );
  const sql = `insert into ${table} (id_produk, id_proyek, jumlah, harga, hargakustom, instalasi, versi) values (?, ?, ?, ?, ?, ?, ?)`;
  const values = [
    id_produk,
    id_proyek,
    jumlah,
    harga ?? 0,
    hargakustom,
    instalasi ?? 0,
    versi,
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const createNewVersion = ({ id_proyek, versi }) => {
  const sql = `INSERT INTO ${table} (id_proyek, id_produk, jumlah, harga, instalasi, keterangan, versi) SELECT id_proyek, id_produk, jumlah, harga, instalasi, keterangan, (SELECT max(versi) + 1 from keranjangproyek where id_proyek=?) FROM keranjangproyek WHERE id_proyek=? and versi=?`;
  const values = [id_proyek, id_proyek, versi];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

// const update = ({ id, id_stok, id_proyek, jumlah, harga }) => {
//   const sql = `update ${table} set ${id_proyek ? `id_stok=${id_stok},` : ""} ${
//     id_proyek ? `id_proyek=${id_proyek},` : ""
//   } ${jumlah ? `jumlah=${jumlah},` : ""} ${
//     harga ? `harga=${harga}` : ""
//   } where id=${id}`;
//   console.log(sql);
//   return new Promise((resolve, reject) => {
//     connection.query(sql, (err, res) => {
//       if (err) reject(err);
//       resolve(res);
//     });
//   });
// };

const update = ({ id, jumlah, harga, hargakustom }) => {
  console.log("Harga Kustom: " + hargakustom);
  const sql = `update ${table} set jumlah = ?, harga = ?, hargakustom = ? where id=?`;
  const values = [jumlah, harga, hargakustom == "" ? null : hargakustom, id];
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

module.exports = {
  list,
  listVersion,
  create,
  createNewVersion,
  update,
  destroy,
};
