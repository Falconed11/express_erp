const connection = require("./db");

const table = "produkmasuk";

const list = ({ id_produk }) => {
  const sql = `select pm.*, p.id_kustom, p.nama, p.tipe, p.satuan, p.stok, m.nama merek, v.nama vendor from ${table} pm left join produk p on p.id=pm.id_produk left join merek m on m.id=p.id_merek left join vendor v on v.id=pm.id_vendor where 1 ${
    id_produk ? `and id_produk = ?` : ""
  } order by pm.tanggal desc`;
  const values = [];
  if (id_produk) values.push(id_produk);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};
const create = ({
  lunas,
  id_produk,
  id_vendor,
  jumlah,
  harga,
  terbayar,
  tanggal,
  jatuhtempo,
}) => {
  jumlah = jumlah ?? 0;
  harga = harga ?? 0;
  terbayar = terbayar ?? 0;
  let sql = `insert into ${table} (id_produk, id_vendor, jumlah, harga, terbayar, tanggal, jatuhtempo) values (?,?,?,?,?,?,?);`;
  let values = [
    id_produk,
    id_vendor,
    jumlah,
    harga,
    lunas == "1" ? jumlah * harga : terbayar,
    tanggal,
    jatuhtempo,
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
    });
    sql = `update produk set stok = stok + ? where id=?;`;
    values = [jumlah, id_produk];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
    });
    setTimeout(() => {
      resolve({ msg: "Sukses" });
    }, 100);
  });
};
const update = ({
  id,
  id_produk,
  oldJumlah,
  jumlah,
  harga,
  id_vendor,
  tanggal,
  lunas,
  terbayar,
  jatuhtempo,
}) => {
  let sql = `update ${table} set id_produk=?, jumlah=?, harga=?, id_vendor=?, tanggal=?, terbayar=?, jatuhtempo=? where id=?`;
  let values = [
    id_produk,
    jumlah,
    harga,
    id_vendor,
    tanggal,
    lunas == "1" ? jumlah * harga : terbayar,
    lunas == 0 ? jatuhtempo : null,
    id,
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
    });
    sql = `update produk set stok=stok + ? where id = ?`;
    values = [jumlah - oldJumlah, id_produk];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
    });
    setTimeout(() => {
      resolve({ msg: "Sukses" });
    }, 100);
  });
};
const destroy = ({ id, id_produk, jumlah }) => {
  let sql = `delete from ${table} where id = ?`;
  let values = [id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
    });
    sql = `update produk set stok=stok - ? where id = ?`;
    values = [jumlah, id_produk];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
    });
    setTimeout(() => {
      resolve({ msg: "Sukses" });
    }, 100);
  });
};

module.exports = { list, create, update, destroy };
