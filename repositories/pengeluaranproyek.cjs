const connection = require("./db.cjs");
const table = "pengeluaranproyek";

const list = ({ id_proyek, monthyear, start, end, id_vendor, id_kategori }) => {
  const sql = `Select kp.nama kategori, i.nama instansi,v.nama vendor, pk.id_produkmasuk, pm.harga hargaprodukmasuk, pp.id_produkkeluar, pr.id id_proyek, pr.id_second, pr.nama namaproyek, pr.id_instansi, pp.id id_pengeluaranproyek, pp.tanggal tanggalpengeluaran, pp.jumlah, pp.harga hargapengeluaran, pp.status, pp.lunas, pp.keterangan keteranganpp, k.id id_karyawan, k.nama namakaryawan, p.*, m.nama merek From ${table} pp 
  left join produk p on pp.id_produk = p.id 
  left join karyawan k on pp.id_karyawan = k.id 
  left join proyek pr on pp.id_proyek=pr.id 
  left join merek m on m.id=p.id_merek 
  left join vendor v on v.id=pp.id_vendor 
  left join produkkeluar pk on pk.id=pp.id_produkkeluar 
  left join produkmasuk pm on pm.id=pk.id_produkmasuk 
  left join instansi i on pr.id_instansi=i.id 
  left join kategoriproduk kp on p.id_kategori = kp.id  
  where 1=1 ${id_proyek ? `and pr.id=?` : ""} ${
    monthyear ? `and DATE_FORMAT(pp.tanggal, '%m-%Y') =?` : ""
  } ${start ? `and pp.tanggal>=?` : ""} ${end ? `and pp.tanggal<=?` : ""} ${
    id_vendor ? `and pp.id_vendor=?` : ""
  } ${id_kategori ? "and id_kategori=?" : ""} order by pp.tanggal desc`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  if (start) values.push(start);
  if (end) values.push(end);
  if (id_vendor) values.push(id_vendor);
  if (id_kategori) values.push(id_kategori);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) console.log(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id_proyek,
  idproyek,
  tanggal,
  id_karyawan,
  karyawan,
  id_vendor,
  id_produk,
  idproduk,
  jumlah,
  harga,
  status,
  keterangan,
}) => {
  const sql = `insert into ${table} (id_proyek, tanggal, id_karyawan, id_produk, id_vendor, jumlah, harga, status, keterangan) values (${
    idproyek ? `(select id from proyek where id_second=?)` : `?`
  }, ?, ${karyawan ? `(select id from karyawan where nama=?)` : `?`}, ${
    idproduk ? `(select id from produk where id_kustom=?)` : `?`
  }, ?, ?, ?, ?, ?)`;
  const values = [
    idproyek ?? id_proyek,
    tanggal,
    karyawan ?? id_karyawan,
    idproduk ?? id_produk ?? "",
    id_vendor,
    jumlah,
    harga ?? 0,
    status ?? 0,
    keterangan ?? "",
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      console.log(err);
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, tanggal, jumlah, harga, status, keterangan }) => {
  const sql = `update ${table} set tanggal = ?, jumlah = ?, harga = ?, status = ?, keterangan = ? where id=?`;
  const values = [tanggal, jumlah, harga, status ?? 0, keterangan, id];
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

module.exports = { list, create, update, destroy };
