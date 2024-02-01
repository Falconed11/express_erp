const connection = require("./db");

const totalOperasional = ({ monthyear, startDate, endDate }) => {
  const sql = `select * from kategorioperasionalkantor k left join (Select k.nama kategori, DATE_FORMAT(o.tanggal, '%m-%Y') tanggal, sum(o.biaya) biaya From operasionalkantor o left join kategorioperasionalkantor k on o.id_kategorioperasionalkantor = k.id where 1=1 ${
    monthyear ? `and DATE_FORMAT(o.tanggal, '%m-%Y')='${monthyear}'` : ""
  } ${startDate ? `and tanggal>='${startDate}'` : ""} ${
    endDate ? `and tanggal<='${endDate}'` : ""
  } group by ${
    monthyear ? "DATE_FORMAT(o.tanggal, '%m-%Y')," : ""
  } k.id) s on k.nama = s.kategori`;
  console.log(sql);
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      console.log(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

module.exports = { totalOperasional };
