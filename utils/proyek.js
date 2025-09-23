const { pool } = require("./db.2.0.0");
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
  countProgressNoOffer,
}) => {
  const validColumns = ["tanggal", "tanggal_penawaran"];
  if (sort)
    if (validColumns.includes(sort)) {
    } else {
      throw new Error("Kolom tidak valid");
    }

  const sql = `Select p.*, sp.nama statusproyek, k.nama namakaryawan, pr.nama namaperusahaan, pr.logo logoperusahaan, pr.deskripsi deskripsiperusahaan, pr.alamat alamatperusahaan, pr.kontak kontakperusahaan, i.nama instansi, i.swasta, i.kota, mp.jumlahbarangkeluar, mp.pengeluaranproyek, kp.totalmodal, kp.totalpenawaran From ${table} p 
  left join statusproyek sp on p.id_statusproyek = sp.id 
  left join karyawan k on p.id_karyawan = k.id 
  left join perusahaan pr on p.id_perusahaan = pr.id 
  left join instansi i on p.id_instansi=i.id 
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
  order by 
    CASE 
      WHEN versi <=0 and jumlahbarangkeluar>0
      THEN 1
      ELSE 2 
    END ${
      sort
        ? `,p.${sort} desc, p.${
            sort == "tanggal" ? "tanggal_penawaran" : "tanggal"
          } desc, i.nama`
        : ""
    }`;
  const values = [
    ...(id ? [id] : []),
    ...(id_instansi ? [id_instansi] : []),
    ...(start ? [start] : []),
    ...(end ? [end] : []),
    ...(id_karyawan ? [id_karyawan] : []),
    ...(id_statusproyek ? [id_statusproyek] : []),
  ];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({
  id,
  id_perusahaan,
  id_instansi,
  nama,
  klien,
  id_karyawan,
  karyawan,
  id_statusproyek,
  tanggal,
  keterangan,
  id_po,
}) => {
  // let sql = `select id_kustom from ${table} where DATE_FORMAT(tanggal, '%m %Y') = DATE_FORMAT(?, '%m %Y') order by id_kustom desc limit 1`;
  // let values = [tanggal];
  // connection.query(sql, values, (err, res) => {
  //   if (err) reject(err);
  //   let id_kustom = 1;
  //   if (res.length > 0) {
  //     id_kustom = res[0].id_kustom + 1;
  //   }
  const sql = `insert into ${table} (id_statusproyek, id_penawaran, id_instansi, id_perusahaan, id_po, nama, klien, id_karyawan, tanggal_penawaran, keterangan) select ?, ${sqlIdPenawaran}, ?, ?, ?, ?, ?, ${
    karyawan ? `(select id from karyawan where nama = ?)` : "?"
  }, ?, ?`;
  const values = [
    id_statusproyek,
    tanggal,
    tanggal,
    id_instansi,
    id_perusahaan,
    id_po,
    nama,
    klien,
    karyawan ?? id_karyawan,
    tanggal,
    keterangan ?? "",
  ];
  const [rows] = await pool.execute(sql, values);
  return rows;
  // });
};

async function update({
  id,
  id_instansi,
  id_second,
  id_perusahaan,
  nama,
  klien,
  id_karyawan,
  id_statusproyek,
  tanggal,
  tanggalsuratjalan,
  alamatsuratjalan,
  id_po,
  keterangan,
}) {
  const fields = [];
  const values = [];
  const isExist = (v) => v != null;
  if (isExist(id_instansi)) {
    fields.push("id_instansi=?");
    values.push(id_instansi);
  }
  if (isExist(id_second)) {
    fields.push("id_second=?");
    values.push(id_second);
  }
  if (isExist(id_perusahaan)) {
    fields.push("id_perusahaan=?");
    values.push(id_perusahaan);
  }
  if (isExist(nama)) {
    fields.push("nama=?");
    values.push(nama);
  }
  if (isExist(klien)) {
    fields.push("klien=?");
    values.push(klien);
  }
  if (isExist(id_karyawan)) {
    fields.push("id_karyawan=?");
    values.push(id_karyawan);
  }
  if (isExist(id_statusproyek)) {
    fields.push("id_statusproyek=?");
    values.push(id_statusproyek);
  }
  if (isExist(tanggal)) {
    fields.push("tanggal=?");
    values.push(tanggal);
  }
  if (isExist(tanggalsuratjalan)) {
    fields.push("tanggalsuratjalan=?");
    values.push(tanggalsuratjalan);
  }
  if (isExist(alamatsuratjalan)) {
    fields.push("alamatsuratjalan=?");
    values.push(alamatsuratjalan);
  }
  if (isExist(id_po)) {
    fields.push("id_po=?");
    values.push(id_po);
  }
  if (isExist(keterangan)) {
    fields.push("keterangan=?");
    values.push(keterangan);
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  const [rows] = await pool.execute(sql, values);
  return rows;
}

const updateVersion = async ({ id, versi, tanggal, id_statusproyek }) => {
  const qIdCustom =
    "(select coalesce(id_kustom,((select id_kustom from proyek where id_kustom>0 and DATE_FORMAT(tanggal, '%m %Y')=DATE_FORMAT(?, '%m %Y') order by id_kustom desc limit 1)+1),1) from proyek where id=?)";
  const sql = `update ${table} set versi=?, id_kustom=${qIdCustom}, tanggal=?${
    id_statusproyek ? ", id_statusproyek=?" : ""
  } where id=?`;
  console.log(sql);
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

// const destroy = ({ id }) => {
//   const sql = `delete from keranjangproyek where id_proyek = ?;delete from rekapitulasiproyek where id_proyek = ?; delete from ${table} where id = ?;`;
//   const values = [id, id, id,];
//   return new Promise((resolve, reject) => {
//     connectionmq.query(sql, values, (err, res) => {
//       if (err) reject(err);
//       resolve(res);
//     });
//   });
// };

const destroy = async ({ id }) => {
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    let sql, values, result;

    sql = `delete from keranjangproyek where id_proyek = ?`;
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
