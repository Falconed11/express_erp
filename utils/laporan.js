const connection = require("./db");
const connection2 = require("./dbmq");

const totalOperasional = ({ monthyear, startDate, endDate }) => {
  const sql = `select * from kategorioperasionalkantor k left join (Select k.nama kategori, DATE_FORMAT(o.tanggal, '%m-%Y') tanggal, sum(o.biaya) biaya From operasionalkantor o left join kategorioperasionalkantor k on o.id_kategorioperasionalkantor = k.id where 1=1 ${
    monthyear ? `and DATE_FORMAT(o.tanggal, '%m-%Y')='${monthyear}'` : ""
  } ${startDate ? `and tanggal>='${startDate}'` : ""} ${
    endDate ? `and tanggal<='${endDate}'` : ""
  } group by ${
    monthyear ? "DATE_FORMAT(o.tanggal, '%m-%Y')," : ""
  } k.id) s on k.nama = s.kategori order by k.nama`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      console.log(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const bulananProyek = ({ endDate, startDate }) => {
  const sql = `CREATE TEMPORARY TABLE sumpengeluaran select id_proyek id1, sum(case when harga = 0 then jumlah*hargamodal else jumlah*harga end) byproduksi, date_format(pp.tanggal, '%m-%Y') p1 from pengeluaranproyek pp left join produk p on pp.id_produk=p.id where date_format(pp.tanggal, '%m-%Y') >= '${startDate}' and date_format(pp.tanggal, '%m-%Y') <= '${endDate}' group by pp.id_proyek, p1 order by p1, id_proyek; CREATE TEMPORARY TABLE sumpembayaran select id_proyek id2, sum(nominal) omset, carabayar tt, date_format(tanggal, '%m-%Y') p2 from pembayaranproyek where date_format(tanggal, '%m-%Y') >= '${startDate}' and date_format(tanggal, '%m-%Y') <= '${endDate}' group by id_proyek, p2 order by p2, id_proyek; select instansi, nama, COALESCE (id1,id2) id_proyek, swasta, COALESCE(p1,p2) periode, COALESCE(byproduksi,0) byproduksi, COALESCE(omset,0) omset, tt from ((select * from sumpengeluaran p left join sumpembayaran pm on p.id1=pm.id2 and p.p1=pm.p2) union (select * from sumpengeluaran p right join sumpembayaran pm on p.id1=pm.id2 and p.p1=pm.p2)) s left join proyek p on COALESCE(s.id1, s.id2)=p.id order by periode, nama; DROP TEMPORARY TABLE IF EXISTS sumpengeluaran, sumpembayaran;`;
  return new Promise((resolve, reject) => {
    connection2.query(sql, (err, res) => {
      console.log(err);
      if (!res) res = [];
      resolve(res[2]);
    });
  });
};

const penawaran = ({ start, end }) => {
  const totalPenawaran = `select id_proyek, sum(jumlah*harga) totalpenawaran from keranjangproyek group by id_proyek`;
  const penawaranKaryawan = `select 
    p.id_karyawan, 
    COUNT(p.id) jumlahpenawaran, 
    SUM(tp.totalpenawaran) nilaipenawaran, 
    SUM(CASE WHEN p.versi > 0 THEN tp.totalpenawaran ELSE 0 END) nilaipenawarandeal, 
    SUM(p.versi > 0) jumlahpenawarandeal, 
    SUM(CASE WHEN p.versi = 0 THEN tp.totalpenawaran ELSE 0 END) nilaipenawaranwaiting, 
    SUM(p.versi = 0) jumlahpenawaranwaiting, 
    SUM(CASE WHEN p.versi < 0 THEN tp.totalpenawaran ELSE 0 END) nilaipenawaranreject, 
    SUM(p.versi < 0) jumlahpenawaranreject 
FROM proyek p 
LEFT JOIN (${totalPenawaran}) tp ON tp.id_proyek = p.id 
WHERE 1 
  ${start ? "AND tanggal_penawaran >= ?" : ""} 
  ${end ? "AND tanggal_penawaran <= ?" : ""} 
GROUP BY p.id_karyawan`;
  const sql = `SELECT k.id, k.nama, pk.* FROM karyawan k LEFT JOIN (${penawaranKaryawan}) pk ON pk.id_karyawan = k.id`;
  const values = [start, end].filter((v) => v !== undefined);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      console.log("Error : " + err);
      if (err) reject(err);
      resolve(res);
    });
  });
};

const omset = ({ start, end }) => {
  const biayaProduksi = `select id_proyek, sum(jumlah*harga) biayaproduksi from pengeluaranproyek group by id_proyek`;
  const omset = `select id_proyek, sum(nominal) omset from pembayaranproyek group by id_proyek`;
  const sql = `select p.versi, p.tanggal, p.id, id_second, p.nama, i.nama customer, swasta, bp.biayaproduksi, o.omset from proyek p left join (${biayaProduksi}) bp on p.id=bp.id_proyek left join (${omset}) o on p.id=o.id_proyek left join instansi i on p.id_instansi=i.id where 1=1 ${
    start && end ? "and tanggal>=? and tanggal <=?" : ""
  } order by id_second`;
  const values = [start, end];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { totalOperasional, bulananProyek, omset, penawaran };
