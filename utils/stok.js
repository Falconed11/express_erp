const connection = require("./db");
const table = "stok";
const list = () => {
  const sql = `Select s.*, p.nama, p.tipe, p.satuan, k.nama as kategori, sk.nama as subkategori, m.nama as merek, g.nama as gudang, d.nama as distributor From ${table} s
  left join produk p on s.id_produk = p.id
  left join kategoriproduk k on p.id_kategori = k.id
  left join subkategoriproduk sk on p.id_subkategori = sk.id
  left join merek m on p.id_merek = m.id
  left join gudang g on s.id_gudang = g.id
  left join distributor d on s.id_distributor = d.id`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  harga,
  jumlah,
  terbayar,
  tanggal,
  jatuhtempo,
  id_produk,
  id_gudang,
  id_distributor,
  keterangan,
}) => {
  const sql = `insert into ${table} (harga, jumlah, terbayar, tanggal, jatuhtempo, id_produk, id_gudang, id_distributor, keterangan) values ('${harga}', '${jumlah}', '${terbayar}', '${tanggal}', '${jatuhtempo}', '${id_produk}', '${id_gudang}', '${id_distributor}', '${keterangan}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({
  id,
  harga,
  jumlah,
  terbayar,
  tanggal,
  jatuhtempo,
  id_produk,
  id_gudang,
  id_distributor,
  keterangan,
}) => {
  const sql = `update ${table} set harga='${harga}', jumlah='${jumlah}', terbayar='${terbayar}', tanggal='${tanggal}', tanggal='${jatuhtempo}', id_produk='${id_produk}', id_gudang='${id_gudang}', id_distributor='${id_distributor}', keterangan='${keterangan}' where id=${id}`;
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
