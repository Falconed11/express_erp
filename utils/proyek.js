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
  const sql = `delete from keranjangproyek where id_proyek = ?; delete from pengeluaranproyek where id_proyek = ?; delete from pembayaranproyek where id_proyek = ?;delete from ${table} where id = ?;`;
  const values = [id, id, id, id];
  return new Promise((resolve, reject) => {
    connectionmq.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const exportPenawaran = ({ id }) => {
  const sql = `select p.nama namaproyek, p.tanggal tanggalproyek, pr.nama namaproduk, pr.hargamodal, pr.hargajual, pr.tanggal tanggalproduk, i.nama namainstansi, v.nama namavendor, kp.versi, kp.jumlah, kp.harga, kp.hargakustom, kp.instalasi, k.nama namakaryawan, kpr.nama namakategoriproduk from keranjangproyek kp left join proyek p on kp.id_proyek=p.id left join produk pr on kp.id_produk = pr.id left join merek m on pr.id_merek=m.id left join vendor v on pr.id_vendor=v.id left join instansi i on p.id_instansi=i.id left join karyawan k on p.id_karyawan=k.id left join kategoriproduk kpr on pr.id_kategori=kpr.id where id_proyek = ?`;
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
  create,
  update,
  updateVersion,
  destroy,
  exportPenawaran,
};
