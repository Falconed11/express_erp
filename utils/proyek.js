const connection = require("./db");
const table = "proyek";
const list = ({ id }) => {
  const sql = `Select p.*, sp.nama statusproyek, k.nama namakaryawan From ${table} p left join statusproyek sp on p.id_statusproyek = sp.id left join karyawan k on p.id_karyawan = k.id ${
    id ? `where p.id=${id}` : ""
  }`;
  console.log(sql);
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  nama,
  klien,
  id_karyawan,
  id_statusproyek,
  tanggal,
  keterangan,
}) => {
  let sql = `select id_kustom from ${table} where DATE_FORMAT(tanggal, '%m %Y') = DATE_FORMAT('${tanggal}', '%m %Y') order by id_kustom desc limit 1`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      let id_kustom = 1;
      if (res.length > 0) {
        id_kustom = res[0].id_kustom + 1;
      }
      sql = `insert into ${table} (id_kustom, nama, klien, id_karyawan, id_statusproyek, tanggal, keterangan) values ('${id_kustom}', '${nama}', '${klien}', '${id_karyawan}', '${id_statusproyek}', '${tanggal}', '${keterangan}')`;
      connection.query(sql, (err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    });
  });
};

const update = ({
  id,
  nama,
  klien,
  id_karyawan,
  id_statusproyek,
  tanggal,
  keterangan,
}) => {
  const sql = `update ${table} set nama='${nama}', klien='${klien}', id_karyawan='${id_karyawan}', id_statusproyek='${id_statusproyek}', tanggal='${tanggal}', keterangan='${keterangan}' where id=${id}`;
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

module.exports = { list, create, update, destroy };
