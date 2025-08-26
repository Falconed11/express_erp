const connection = require("./db");
const { pool } = require("./db.2.0.0");
const table = "pembayaranproyek";

const list = ({
  id_proyek,
  id_metodepembayaran,
  monthyear,
  start,
  end,
  asc,
}) => {
  const sql = `Select p.id id_proyek, p.nama, i.nama instansi, mp.nama metodepembayaran, mp.norekening, mp.atasnama, b.nama nama_bank, pp.* from ${table} pp 
  left join proyek p on pp.id_proyek=p.id 
  left join metodepembayaran mp on pp.id_metodepembayaran=mp.id 
  left join bank b on mp.id_bank = b.id 
  left join instansi i on p.id_instansi=i.id where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } ${monthyear ? `and DATE_FORMAT(tanggal, '%m-%Y')=?` : ""} ${
    start ? `and pp.tanggal>=?` : ""
  } ${end ? `and pp.tanggal<=?` : ""} ${
    id_metodepembayaran ? "and id_metodepembayaran=?" : ""
  } order by pp.tanggal ${asc ? "asc" : "desc"}`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  if (start) values.push(start);
  if (end) values.push(end);
  if (id_metodepembayaran) values.push(id_metodepembayaran);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) console.log(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const total = ({ id_proyek, monthyear }) => {
  const sql = `Select sum(nominal) total from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } ${monthyear ? `and DATE_FORMAT(tanggal, '%m-%Y')=?` : ""}`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id_proyek,
  idproyek,
  nominal,
  id_metodepembayaran,
  pembayar,
  untukpembayaran,
  tanggal,
  keterangan,
}) => {
  const sql = `insert into ${table} (id_proyek, nominal, id_metodepembayaran, pembayar, untukpembayaran, tanggal, keterangan) values (${
    idproyek ? `(select id from proyek where id_second=?)` : `?`
  }, ?, ?, ?, ?, ?, ?)`;
  const values = [
    idproyek ?? id_proyek,
    nominal,
    id_metodepembayaran,
    pembayar,
    untukpembayaran,
    tanggal,
    keterangan ?? "",
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const getNextPaymentId = async (year, conn) => {
  const [rows] = await conn.query(
    `SELECT last_seq FROM kwitansi_sequences WHERE year = ? FOR UPDATE`,
    [year]
  );
  let nextSeq;
  if (rows.length) {
    nextSeq = rows[0].last_seq + 1;
    await conn.query(
      `UPDATE kwitansi_sequences SET last_seq = ? WHERE year = ?`,
      [nextSeq, year]
    );
  } else {
    nextSeq = 1;
    await conn.query(
      `INSERT INTO kwitansi_sequences (year, last_seq) VALUES (?, ?)`,
      [year, nextSeq]
    );
  }
  return {
    seq: nextSeq,
    id_second: `${year}-${String(nextSeq).padStart(4, "0")}`,
  };
};

const update = async ({
  id,
  id_proyek,
  nominal,
  status,
  id_metodepembayaran,
  pembayar,
  untukpembayaran,
  tanggal,
  keterangan,
}) => {
  if (!tanggal) throw new Error("Tanggal wajib diisi!");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[current]] = await conn.query(
      `SELECT status, tanggal, id_second FROM ${table} WHERE id = ?`,
      [id]
    );
    if (!current) throw new Error("Payment not found");
    const year = new Date(tanggal).getFullYear();
    if (
      (status && !current.id_second) ||
      (status && new Date(current.tanggal).getFullYear() !== year)
    ) {
      const { seq, id_second } = await getNextPaymentId(year, conn);

      await conn.query(
        `UPDATE ${table} SET status = ?, id_second = ?, nominal = ?, id_metodepembayaran = ?, pembayar=?, untukpembayaran=?, tanggal = ?, keterangan = ? WHERE id = ?`,
        [
          status,
          id_second,
          nominal,
          id_metodepembayaran,
          pembayar,
          untukpembayaran,
          tanggal,
          keterangan,
          id,
        ]
      );

      await conn.commit();
      return id_second;
    }
    await conn.query(
      `update ${table} set id_proyek = ?, nominal = ?, status = ?, id_metodepembayaran = ?, pembayar = ?, untukpembayaran = ?, tanggal = ?, keterangan = ? where id=?`,
      [
        id_proyek,
        nominal,
        status,
        id_metodepembayaran,
        pembayar,
        untukpembayaran,
        tanggal,
        keterangan,
        id,
      ]
    );
    await conn.commit();
    return current.id;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
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

module.exports = { list, create, update, destroy, total };
