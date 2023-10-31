const connection = require("./db");
const table = "stok";
const list = () => {
  const sql = `Select * From ${table}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  nama,
  merek,
  tipe,
  satuan,
  harga,
  jumlah,
  terbayar,
  tanggalbeli,
  id_gudang,
  id_distributor,
}) => {
  const sql = `insert into ${table} (nama, merek, tipe, satuan, harga, jumlah, terbayar, tanggalbeli, id_gudang, id_distributor) values ('${nama}', '${merek}', '${tipe}', '${satuan}', '${harga}', '${jumlah}', '${terbayar}', '${tanggalbeli}', '${id_gudang}', '${id_distributor}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({
  id,
  nama,
  merek,
  tipe,
  satuan,
  harga,
  jumlah,
  terbayar,
  tanggalbeli,
  id_gudang,
  id_distributor,
}) => {
  const sql = `update ${table} set nama='${nama}', merek='${merek}', tipe='${tipe}', satuan='${satuan}', harga='${harga}', jumlah='${jumlah}', terbayar='${terbayar}', tanggalbeli='${tanggalbeli}', id_gudang='${id_gudang}', id_distributor='${id_distributor}' where id=${id}`;
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
