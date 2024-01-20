const connection = require("./db");
const table = "keranjangnota";

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
const list = ({ id_nota }) => {
  const sql = `Select n.id id_keranjangnota, n.jumlah, n.harga hargakustom, p.* From ${table} n left join produk p on n.id_produk = p.id where 1=1 ${
    id_nota ? `and id_nota=${id_nota}` : ""
  }`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ id_produk, id_nota, jumlah, harga }) => {
  const sql = `insert into ${table} (id_produk, id_nota, jumlah, harga) values ('${id_produk}', '${id_nota}', '${jumlah}', '${harga}')`;
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
