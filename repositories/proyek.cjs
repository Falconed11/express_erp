const { pool } = require("./db.2.0.0.cjs");
const { create: customerCreate } = require("./customer.cjs");
const { withTransaction } = require("./../helpers/transaction.cjs");
const table = "proyek";
const sqlIdPenawaran = `(select CASE WHEN EXISTS (SELECT 1 FROM ${table} where DATE_FORMAT(tanggal_penawaran, '%m %Y')=DATE_FORMAT(?, '%m %Y')) THEN (select id_penawaran + 1 from ${table} where DATE_FORMAT(tanggal_penawaran, '%m %Y')=DATE_FORMAT(?, '%m %Y') order by id_penawaran desc limit 1) ELSE 1 END AS result)`;
const list = async ({
  id,
  id_instansi,
  start,
  end,
  sort,
  id_karyawan,
  id_statusproyek,
  id_produk = null,
  countProgressNoOffer,
}) => {
  const validColumns = ["tanggal", "tanggal_penawaran"];
  if (sort)
    if (validColumns.includes(sort)) {
    } else {
      throw new Error("Kolom tidak valid");
    }
  const sql = `Select p.*, sp.nama statusproyek, sp.progress, k.nama namakaryawan, pr.nama namaperusahaan, concat('${
    process.env.MAIN_URL
  }logo/', pr.logo) logoperusahaan, pr.deskripsi deskripsiperusahaan, pr.alamat alamatperusahaan, pr.kontak kontakperusahaan, i.nama instansi, i.swasta, i.kota, sum(pp.nominal) totalpembayaranproyek, mp.jumlahbarangkeluar, mp.pengeluaranproyek, kp.totalmodal, kp.totalpenawaran
  ${id_produk ? ", count(cp.id_produk) nproduk" : ""}
  From ${table} p 
  left join statusproyek sp on p.id_statusproyek = sp.id 
  left join karyawan k on p.id_karyawan = k.id 
  left join perusahaan pr on p.id_perusahaan = pr.id 
  left join instansi i on p.id_instansi=i.id 
  left join pembayaranproyek pp on pp.id_proyek=p.id
  ${id_produk ? "left join keranjangproyek cp on cp.id_proyek = p.id" : ""}
  left join (SELECT id_proyek, sum(jumlah) jumlahbarangkeluar, sum(jumlah*harga) pengeluaranproyek FROM pengeluaranproyek group BY id_proyek) mp on p.id=mp.id_proyek 
  left join (select id_proyek, sum(kp.jumlah*kp.harga) totalpenawaran, sum(kp.jumlah*p.hargamodal) totalmodal from keranjangproyek kp 
  left join produk p on kp.id_produk=p.id group by id_proyek) kp on kp.id_proyek=p.id 
  where 1=1 ${id ? `and p.id=?` : ""} ${
    id_instansi ? "and id_instansi=?" : ""
  } ${start ? `and p.${sort}>=?` : ""} ${end ? `and p.${sort}<=?` : ""} ${
    id_karyawan ? `and id_karyawan=?` : ""
  }
  ${countProgressNoOffer ? " and versi<=0 and pengeluaranproyek>0 " : ""}
  ${id_statusproyek ? ` and id_statusproyek=? ` : ""}
  ${id_produk ? "and cp.id_produk=?" : ""}
  group by p.id
  order by 
    CASE 
      WHEN p.versi <=0 and jumlahbarangkeluar>0
      THEN 1
      ELSE 2 
    END ${
      sort
        ? `,p.${sort} desc, p.${
            sort == "tanggal" ? "tanggal_penawaran" : "tanggal"
          } desc, i.nama, p.id`
        : ""
    }`;
  const values = [
    ...(id ? [id] : []),
    ...(id_instansi ? [id_instansi] : []),
    ...(start ? [start] : []),
    ...(end ? [end] : []),
    ...(id_karyawan ? [id_karyawan] : []),
    ...(id_statusproyek ? [id_statusproyek] : []),
    ...(id_produk ? [id_produk] : []),
  ];
  try {
    const [rows] = await pool.execute(sql, values);
    return rows;
  } catch (err) {
    console.error("Error : ", err.message);
    throw err;
  }
};
const create = async ({
  id_perusahaan = null,
  id_instansi = null,
  nama = "",
  klien = "",
  id_karyawan = "",
  karyawan = null,
  id_statusproyek,
  tanggal = null,
  tanggal_penawaran = null,
  keterangan = "",
  id_po = "",
  instansi,
  swasta,
  kota,
  alamat,
  lastuser,
}) => {
  try {
    const result = await withTransaction(pool, async (conn) => {
      if (instansi && !id_instansi) {
        const customerInsertId = await customerCreate({
          nama: instansi,
          swasta,
          kota,
          alamat,
          lastuser,
          conn,
        });
        id_instansi = customerInsertId;
      }
      const sql = `insert into ${table} (id_statusproyek, id_penawaran, id_instansi, id_perusahaan, id_po, nama, klien, id_karyawan, tanggal_penawaran, keterangan) select ?, ${sqlIdPenawaran}, ?, ?, ?, ?, ?, ${
        karyawan ? `(select id from karyawan where nama = ?)` : "?"
      }, ?, ?`;
      const values = [
        id_statusproyek,
        tanggal_penawaran,
        tanggal_penawaran,
        id_instansi,
        id_perusahaan,
        id_po,
        nama,
        klien,
        karyawan ?? id_karyawan,
        tanggal_penawaran,
        keterangan ?? "",
      ];
      const [insertResult] = await conn.execute(sql, values);
      return {
        customerInsertId: id_instansi,
        proyekInsertId: insertResult.insertId,
      };
    });
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
/**
 * Gets user data.
 * @returns {Promise<{ seq: number, idCustom: string }>} Promise that resolves with user info.
 */
const getNextProyekId = async (tanggal, conn) => {
  const date = new Date(tanggal);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const periode = year + month;
  const [rows] = await conn.execute(
    `SELECT last_seq FROM proyek_sequences WHERE periode = ? FOR UPDATE`,
    [periode]
  );
  let nextSeq;
  if (rows.length) {
    nextSeq = rows[0].last_seq + 1;
    await conn.query(
      `UPDATE proyek_sequences SET last_seq = ? WHERE periode = ?`,
      [nextSeq, periode]
    );
  } else {
    nextSeq = 1;
    await conn.query(
      `INSERT INTO proyek_sequences (periode, last_seq) VALUES (?, ?)`,
      [periode, nextSeq]
    );
  }
  return {
    seq: nextSeq,
    idCustom: [year, month, String(nextSeq).padStart(2, "0")].join("."),
  };
};
const update = async ({
  id,
  id_instansi = null,
  instansi,
  swasta,
  kota,
  alamat,
  lastuser,
  id_statusproyek,
  tanggal,
  ...rest
}) => {
  if (!id) return new Error("Id harus diisi!");
  // Get proyek data
  const [data] = await list({ id });
  if (!data) throw new Error(`Data id: ${id} not found`);
  const allowedFields = [
    "id_instansi",
    "id_perusahaan",
    "nama",
    "klien",
    "id_karyawan",
    "tanggal_penawaran",
    "tanggalsuratjalan",
    "alamatsuratjalan",
    "id_po",
    "keterangan",
    "versi",
  ];
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(rest)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key == "tanggal" ? "tanggal_penawaran" : key}=?`);
      values.push(value);
    }
  }
  try {
    const result = await withTransaction(pool, async (conn) => {
      if (instansi && !id_instansi) {
        const customerInsertId = await customerCreate({
          nama: instansi,
          swasta,
          kota,
          alamat,
          lastuser,
          conn,
        });
        id_instansi = customerInsertId;
      }
      if (id_instansi) {
        fields.push("id_instansi=?");
        values.push(id_instansi);
      }
      if (id_statusproyek) {
        if (id_statusproyek == -1) {
          fields.push("tanggal_reject=?");
          values.push(new Date());
        }
        if (id_statusproyek == 2) {
          const getYearMonth = (date) => {
            if (!date) return null;
            date = new Date(date);
            return `${date.getFullYear()}${date.getMonth()}`;
          };
          // Cek if id_second already filled or current tanggal is different with new one
          if (
            !data.id_second ||
            getYearMonth(data.tanggal) != getYearMonth(tanggal)
          ) {
            const { idCustom, seq } = await getNextProyekId(tanggal, conn);
            fields.push("id_second=?");
            values.push(idCustom);
          }
        }
        fields.push("id_statusproyek=?");
        values.push(id_statusproyek);
      }
      if (tanggal) {
        fields.push("tanggal=?");
        values.push(tanggal);
      }
      if (lastuser) {
        fields.push("lastuser=?");
        values.push(lastuser);
      }
      if (fields.length === 0)
        return { affectedRows: 0, message: "No fields to update" };
      values.push(id);
      const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
      [updateResult] = await conn.execute(sql, values);
      return {
        customerInsertId: id_instansi,
        updateResult,
      };
    });
    return result;
  } catch (err) {
    console.error("Error: ", err.message);
    throw err;
  }
};
const updateVersion = async ({
  id,
  versi = 0,
  tanggal = null,
  id_statusproyek,
}) => {
  const qIdCustom =
    "(select coalesce(id_kustom,((select id_kustom from proyek where id_kustom>0 and DATE_FORMAT(tanggal, '%m %Y')=DATE_FORMAT(?, '%m %Y') order by id_kustom desc limit 1)+1),1) from proyek where id=?)";
  const sql = `update ${table} set versi=?, id_kustom=${qIdCustom}, tanggal=?${
    id_statusproyek ? ", id_statusproyek=?" : ""
  } where id=?`;
  const values = [
    versi,
    tanggal,
    id,
    tanggal,
    ...(id_statusproyek ? [id_statusproyek] : []),
    id,
  ];
  const [rows] = await pool.execute(sql, values);
  return rows;
};
const destroy = async ({ id }) => {
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    let sql, values, result;

    sql = `delete from keranjangproyek where id_proyek = ?`;
    values = [id];
    [result] = await connection.execute(sql, values);

    sql = `delete from subproyek where id_proyek = ?`;
    values = [id];
    [result] = await connection.execute(sql, values);

    sql = `delete from proyek_keteranganpenawaran where id_proyek = ?`;
    values = [id];
    [result] = await connection.execute(sql, values);

    sql = `delete from rekapitulasiproyek where id_proyek = ?`;
    values = [id];
    [result] = await connection.execute(sql, values);

    sql = `delete from ${table} where id = ?`;
    values = [id];
    [result] = await connection.execute(sql, values);

    // If no errors, commit the transaction
    await connection.commit();
    console.log("Transaction committed successfully.");

    return { message: "Sukses" };
  } catch (error) {
    // If any error occurs, rollback the transaction
    await connection.rollback();
    console.error("Transaction rolled back due to error:", error);
    throw error;
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
};
const exportPenawaran = async ({ id, start, end }) => {
  const sql = `select p.id id_proyek, p.nama namaproyek, p.id_Perusahaan idperusahaan, p.klien, p.tanggal tanggalproyek, pr.nama namaproduk, pr.hargamodal, pr.hargajual, pr.tanggal tanggalproduk, pr.tipe, pr.stok, pr.satuan, i.nama namainstansi, i.swasta, i.kota, i.alamat alamatinstansi, m.nama namamerek, v.nama namavendor, v.alamat alamatvendor, kp.versi, kp.jumlah, kp.harga, kp.hargakustom, kp.instalasi, k.nama namakaryawan, kpr.nama namakategoriproduk, rp.versi versirekapitulasiproyek, rp.diskon, rp.pajak, rp.audio, rp.cctv, rp.multimedia from keranjangproyek kp left join proyek p on kp.id_proyek=p.id left join produk pr on kp.id_produk = pr.id left join merek m on pr.id_merek=m.id left join vendor v on pr.id_vendor=v.id left join instansi i on p.id_instansi=i.id left join karyawan k on p.id_karyawan=k.id left join kategoriproduk kpr on pr.id_kategori=kpr.id left join rekapitulasiproyek rp on p.id=rp.id_proyek where 1=1 ${
    id ? "and id_proyek = ?" : ""
  } ${start ? "and p.tanggal>=?" : ""} ${end ? "and p.tanggal<=?" : ""}`;
  const values = [];
  if (id) values.push(id);
  if (start) values.push(start);
  if (end) values.push(end);
  const [rows] = await pool.execute(sql, values);
  return rows;
};
module.exports = {
  list,
  create,
  update,
  updateVersion,
  destroy,
  exportPenawaran,
};
