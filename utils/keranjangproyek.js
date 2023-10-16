const connection = require("./db");
const table = "keranjangproyek";
const list = ({ id_proyek }) => {
  const qcol = id_proyek
    ? `, ${table}.harga as hargajual, ${table}.id as id_keranjangproyek, stok.id as id_stok`
    : "";
  const qid_proyek = id_proyek ? `id_proyek = ${id_proyek}` : "";
  const qleft_join = id_proyek
    ? `left join stok on ${table}.id_stok = stok.id`
    : "";
  const where = id_proyek ? "where" : "";
  const sql = `Select * ${qcol} From ${table} ${qleft_join} ${where} ${qid_proyek}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ id_stok, id_proyek, jumlah, harga }) => {
  const sql = `insert into ${table} (id_stok, id_proyek, jumlah, harga) values ('${id_stok}', '${id_proyek}', '${jumlah}', '${harga}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, id_stok, id_proyek, jumlah, harga }) => {
  const sql = `update ${table} set id_stok='${id_stok}', id_proyek='${id_proyek}', jumlah='${jumlah}', harga='${harga}' where id=${id}`;
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
