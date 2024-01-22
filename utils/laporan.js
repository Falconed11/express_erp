const connection = require("./db");

const laporanLR = () => {
  const sql = `Select k.nama kategori, DATE_FORMAT(o.tanggal, '%m-%Y') tanggal, sum(o.biaya) biaya From operasionalkantor o left join kategorioperasionalkantor k on o.id_kategorioperasionalkantor = k.id group by DATE_FORMAT(o.tanggal, '%m-%Y'), o.id_kategorioperasionalkantor`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

module.exports = { laporanLR };
