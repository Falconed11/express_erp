const { withTransaction } = require("../helpers/transaction.cjs");
const { pool } = require("./db.2.0.0.cjs");
const table = "pembayaranproyek";

const list = async ({
  id_proyek,
  id_metodepembayaran,
  monthyear,
  start,
  end,
  asc,
}) => {
  const sql = `Select ki.nama picInvoice, kk.nama picKwitansi, p.id id_proyek, p.nama, i.nama instansi, mp.nama metodepembayaran, mp.norekening, mp.atasnama, b.nama nama_bank, pp.* from ${table} pp 
  left join proyek p on pp.id_proyek=p.id 
  left join karyawan ki on pp.id_karyawaninvoice = ki.id
  left join karyawan kk on pp.id_karyawankwitansi = kk.id
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
  const [results] = await pool.execute(sql, values);
  return results;
};

const total = async ({ id_proyek, monthyear }) => {
  const sql = `Select sum(nominal) total from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } ${monthyear ? `and DATE_FORMAT(tanggal, '%m-%Y')=?` : ""}`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  const [results] = await pool.execute(sql, values);
  return results;
};

const create = async ({
  id_proyek,
  idproyek,
  nominal = 0,
  id_metodepembayaran = null,
  id_karyawaninvoice = null,
  id_karyawankwitansi = null,
  pembayar = "",
  untukpembayaran = "",
  tanggal = "",
  keterangan = "",
}) => {
  if (!id_metodepembayaran) throw new Error("Metode Pembayaran wajib diisi!");
  const sql = `insert into ${table} (id_proyek, nominal, id_metodepembayaran, id_karyawaninvoice, id_karyawankwitansi, pembayar, untukpembayaran, tanggal, keterangan) values (${
    idproyek ? `(select id from proyek where id_second=?)` : `?`
  }, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [
    idproyek ?? id_proyek,
    nominal,
    id_metodepembayaran,
    id_karyawaninvoice,
    id_karyawankwitansi,
    pembayar,
    untukpembayaran,
    tanggal,
    keterangan ?? "",
  ];
  console.log(values);
  const [results] = await pool.execute(sql, values);
  return results;
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

const update = async ({ id, ...rest }) => {
  const { status, tanggal } = rest;
  if (!tanggal) throw new Error("Tanggal wajib diisi!");
  try {
    const result = await withTransaction(pool, async (conn) => {
      const [[current]] = await conn.execute(
        `SELECT status, tanggal, id_second FROM ${table} WHERE id = ?`,
        [id]
      );
      if (!current) throw new Error("Payment not found");

      const year = new Date(tanggal).getFullYear();
      const currentYear = new Date(current.tanggal).getFullYear();
      let id_second = current.id_second;

      if (status && (!id_second || currentYear !== year)) {
        const { id_second: newId } = await getNextPaymentId(year, conn);
        id_second = newId;
      }

      const allowedFields = [
        "status",
        "nominal",
        "id_metodepembayaran",
        "id_karyawaninvoice",
        "id_karyawankwitansi",
        "pembayar",
        "untukpembayaran",
        "tanggal",
        "keterangan",
      ];

      const entries = Object.entries(rest).filter(
        ([k, v]) => allowedFields.includes(k) && v != null
      );

      const fields = entries.map(([k]) => `${k}=?`);
      const values = entries.map(([, v]) => v);

      if (id_second !== current.id_second) {
        fields.push("id_second=?");
        values.push(id_second);
      }

      if (fields.length === 0)
        return { affectedRows: 0, message: "No fields to update" };

      values.push(id);
      const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
      const [result] = await conn.execute(sql, values);
      return result;
    });
    return {
      affectedRows: result.affectedRows || 0,
      message: result.affectedRows ? "Payment updated" : "No fields to update",
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [results] = await pool.execute(sql, values);
  return results;
};

module.exports = { list, create, update, destroy, total };
