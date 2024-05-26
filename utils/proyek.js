const connection = require("./db");
const connectionmq = require("./dbmq");
const table = "proyek";

const list = ({ id, start, end }) => {
  const sql = `Select p.*, sp.nama statusproyek, k.nama namakaryawan, pr.nama namaperusahaan, i.nama instansi, i.swasta, i.kota From ${table} p left join statusproyek sp on p.id_statusproyek = sp.id left join karyawan k on p.id_karyawan = k.id left join perusahaan pr on p.id_perusahaan = pr.id left join instansi i on p.id_instansi=i.id where 1=1 ${
    id ? `and p.id=${id}` : ""
  } ${start ? `and p.tanggal>='${start}'` : ""} ${
    end ? `and p.tanggal<='${end}'` : ""
  } order by p.tanggal desc limit 25`;
  const values = [];
  if (id) values.push(id);
  if (start) values.push(start);
  if (end) values.push(end);
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id,
  id_perusahaan,
  id_instansi,
  nama,
  klien,
  instansi,
  kota,
  id_karyawan,
  karyawan,
  id_statusproyek,
  tanggal,
  keterangan,
}) => {
  let sql = `select id_kustom from ${table} where DATE_FORMAT(tanggal, '%m %Y') = DATE_FORMAT(?, '%m %Y') order by id_kustom desc limit 1`;
  let values = [tanggal];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      let id_kustom = 1;
      if (res.length > 0) {
        id_kustom = res[0].id_kustom + 1;
      }
      sql = `insert into ${table} (id_second, id_instansi, id_kustom, id_perusahaan, nama, klien, instansi, kota, id_karyawan, tanggal, keterangan) values (?, ?, ?, ?, ?, ?, ?, ?, ${
        karyawan ? `(select id from karyawan where nama = ?)` : "?"
      }, ?, ?)`;
      values = [
        id,
        id_instansi,
        id_kustom,
        id_perusahaan,
        nama,
        klien,
        instansi,
        kota,
        karyawan ?? id_karyawan,
        tanggal,
        keterangan ?? "",
      ];
      connection.query(sql, values, (err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    });
  });
};

const update = ({
  id,
  id_instansi,
  id_second,
  id_perusahaan,
  nama,
  klien,
  instansi,
  kota,
  id_karyawan,
  id_statusproyek,
  tanggal,
  keterangan,
}) => {
  const sql = `update ${table} set id_second=?, id_instansi=?, id_perusahaan=?, nama=?, klien=?, instansi=?, kota=?, id_karyawan=?, id_statusproyek=?, tanggal=?, keterangan=? where id=?`;
  const values = [
    id_second,
    id_instansi,
    id_perusahaan,
    nama,
    klien,
    instansi,
    kota,
    id_karyawan,
    id_statusproyek,
    tanggal,
    keterangan,
    id,
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const updateVersion = ({ id, versi }) => {
  const sql = `update ${table} set versi=? where id=?`;
  const values = [versi, id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from pengeluaranproyek where id_proyek = ?; delete from pembayaranproyek where id_proyek = ?;delete from ${table} where id = ?;`;
  const values = [id, id, id];
  return new Promise((resolve, reject) => {
    connectionmq.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, updateVersion, destroy };
