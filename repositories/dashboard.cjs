const connection = require("./db.cjs");
const sumPenawaran = ({ startdate, enddate, swasta, versi }) => {
  const sql = `Select count(*) total from proyek p left join instansi i on p.id_instansi=i.id where tanggal>='${startdate}' and tanggal<='${enddate}' ${
    swasta ? `and swasta=${swasta}` : ""
  } ${versi ? `and versi=${versi}` : ""}`;
  return new Promise((resolve, _reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

module.exports = { sumPenawaran };
