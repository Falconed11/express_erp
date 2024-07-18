const connection = require("./db");
const pool = require("./dbpromise");

const table = "produk";

// const list = () => {
//   const sql = `Select p.*, s.nama as subkategori, k.nama as kategori, m.nama as merek From ${table} p
//   left join subkategoriproduk s on p.id_subkategori = s.id
//   left join kategoriproduk k on p.id_kategori = k.id
//   left join merek m on p.id_merek = m.id`;
//   return new Promise((resolve, reject) => {
//     connection.query(sql, (err, res) => {
//       if (!res) res = [];
//       resolve(res);
//     });
//   });
// };

const list = ({ id, kategori, limit, nama }) => {
  if (nama) nama = "%" + nama + "%";
  const sql = `select kp.nama kategoriproduk, m.nama nmerek, v.nama nvendor, p.* from ${table} p left join merek m on p.id_merek=m.id left join vendor v on p.id_vendor=v.id left join kategoriproduk kp on p.id_kategori = kp.id where 1 ${
    id ? "and p.id=?" : ""
  } ${kategori ? `and id_kategori = ?` : ""} ${
    nama ? "and p.nama like ?" : ""
  } order by kategori, nama, m.nama ${limit ? "limit ?" : ""}`;
  const values = [];
  if (id) values.push(id);
  if (kategori) values.push(kategori);
  if (nama) values.push(nama);
  if (limit) values.push(limit);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const listKategori = () => {
  const sql = `select distinct kategori from ${table}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

// const create = ({
//   id_kategori,
//   id_kustom,
//   nama,
//   id_merek,
//   tipe,
//   id_vendor,
//   stok,
//   satuan,
//   hargamodal,
//   hargajual,
//   tanggal,
//   jatuhtempo,
//   terbayar,
//   lunas,
//   keterangan,
// }) => {
//   hargamodal = hargamodal ?? 0;
//   hargajual = hargajual ?? 0;
//   let sql = `insert into ${table} (id_kategori, id_kustom, nama, id_merek, tipe, id_vendor, stok, satuan, hargamodal, hargajual, tanggal, keterangan, manualinput) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`;
//   let values = [
//     id_kategori,
//     id_kustom,
//     nama,
//     id_merek ?? 0,
//     tipe,
//     id_vendor ?? 0,
//     stok,
//     satuan,
//     hargamodal,
//     hargajual,
//     tanggal,
//     keterangan ?? "",
//   ];
//   return new Promise((resolve, reject) => {
//     connection.query(sql, values, (err, res) => {
//       if (err) reject(err);
//     });
//     if (stok > 0) {
//       sql = `insert into produkmasuk (id_produk, jumlah, harga, tanggal, jatuhtempo, terbayar, id_vendor) select (select id from ${table} where nama=? and id_kustom=? and id_vendor=? and tanggal=?), ?, ?, ?, ?, ?, ?`;
//       values = [
//         nama,
//         id_kustom,
//         id_vendor,
//         tanggal,
//         stok,
//         hargamodal,
//         tanggal,
//         jatuhtempo ?? null,
//         lunas == "1" ? stok * hargamodal : terbayar,
//         id_vendor,
//       ];
//       connection.query(sql, values, (err, res) => {
//         if (err) reject(err);
//       });
//     }
//     setTimeout(() => {
//       resolve({ msg: "Sukses" });
//     }, 100);
//   });
// };

// const update = ({
//   id,
//   nama,
//   id_kategori,
//   id_subkategori,
//   id_merek,
//   tipe,
//   jumlah,
//   satuan,
//   keterangan,
// }) => {
//   const sql = `update ${table} set nama='${nama}', id_kategori='${id_kategori}', id_subkategori='${id_subkategori}', id_merek='${id_merek}', tipe='${tipe}', jumlah='${jumlah}', satuan='${satuan}', keterangan='${keterangan}' where id=${id}`;
//   return new Promise((resolve, reject) => {
//     connection.query(sql, (err, res) => {
//       if (err) reject(err);
//       resolve(res);
//     });
//   });
// };

const create = async ({
  id_kategori,
  id_kustom,
  nama,
  id_merek,
  tipe,
  id_vendor,
  stok,
  satuan,
  hargamodal,
  hargajual,
  tanggal,
  jatuhtempo,
  terbayar,
  lunas,
  keterangan,
}) => {
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    let sql = `insert into ${table} (id_kategori, id_kustom, nama, id_merek, tipe, stok, satuan, hargamodal, hargajual, tanggal, keterangan, manualinput) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`;
    let values = [
      id_kategori,
      id_kustom,
      nama,
      id_merek ?? 0,
      tipe,
      stok,
      satuan,
      hargamodal,
      hargajual,
      tanggal,
      keterangan ?? "",
    ];
    const [result1] = await connection.execute(sql, values);

    if (id_vendor && stok && stok > 0) {
      sql = `insert into produkmasuk (id_produk, jumlah, harga, tanggal, jatuhtempo, terbayar, id_vendor) values (${result1.insertId}, ?, ?, ?, ?, ?, ?)`;
      values = [
        stok,
        hargamodal,
        tanggal,
        jatuhtempo ?? null,
        lunas == "1" ? stok * hargamodal : terbayar,
        id_vendor,
      ];
      const [result2] = await connection.execute(sql, values);
    }
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

const update = ({
  id,
  id_kustom,
  id_kategori,
  nama,
  id_merek,
  tipe,
  id_vendor,
  stok,
  satuan,
  hargamodal,
  hargajual,
  keterangan,
}) => {
  const sql = `update ${table} set id_kategori=?, id_kustom=?, nama=?, id_merek=?, tipe=?, id_vendor=?, stok=?, satuan=?, hargamodal=?, hargajual=?, keterangan=? where id=?`;
  return new Promise((resolve, reject) => {
    connection.query(
      sql,
      [
        id_kategori,
        id_kustom,
        nama,
        id_merek,
        tipe,
        id_vendor,
        stok,
        satuan,
        hargamodal,
        hargajual,
        keterangan,
        id,
      ],
      (err, res) => {
        if (err) reject(err);
        resolve(res);
      }
    );
  });
};
const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  return new Promise((resolve, reject) => {
    connection.query(sql, [id], (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, destroy, listKategori };
