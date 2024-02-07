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

module.exports = { totalOperasional, bulananProyek };
