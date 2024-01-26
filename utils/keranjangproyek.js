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
  const sql = `Select kp.id id_keranjangproyek, kp.jumlah, kp.harga hargakustom, p.* From ${table} kp left join produk p on kp.id_produk = p.id where 1=1 ${
    id_proyek ? `and id_proyek=${id_proyek}` : ""
  } ${instalasi ? `and instalasi = ${instalasi}` : ""} and versi=${versi}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const listVersion = ({ id_proyek }) => {
  const sql = `select distinct versi from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=${id_proyek}` : ""
  }`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
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

const create = ({ id_produk, id_proyek, jumlah, harga, instalasi, versi }) => {
  const sql = `insert into ${table} (id_produk, id_proyek, jumlah, harga, instalasi, versi) values ('${id_produk}', '${id_proyek}', '${jumlah}', '${harga}', '${instalasi}', '${versi}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const createNewVersion = ({ id_proyek, versi }) => {
  const sql = `INSERT INTO ${table} (id_proyek, id_produk, jumlah, harga, instalasi, keterangan, versi) SELECT id_proyek, id_produk, jumlah, harga, instalasi, keterangan, (SELECT max(versi) + 1 from keranjangproyek where id_proyek=${id_proyek}) FROM keranjangproyek
  WHERE id_proyek=${id_proyek} and versi=${versi}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
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

const update = ({ id, jumlah, harga }) => {
  const sql = `update ${table} set jumlah = ${jumlah}, harga = ${harga} where id=${id}`;
  console.log(sql);
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

module.exports = {
  list,
  listVersion,
  create,
  createNewVersion,
  update,
  destroy,
};
