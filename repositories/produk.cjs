const { pool } = require("./db.2.0.0.cjs");
const table = "produk";
const { withTransaction } = require("./../helpers/transaction.cjs");
const { create: createKategori } = require("./kategoriproduk.cjs");
const { create: createMerek } = require("./merek.cjs");
const { create: createVendor } = require("./vendor.cjs");

const list = async ({ id, kategori, limit, nama, isReadyStock }) => {
  if (nama) nama = "%" + nama + "%";
  const sql = `select kp.nama kategoriproduk, m.nama nmerek, v.nama nvendor, p.* from ${table} p left join merek m on p.id_merek=m.id left join vendor v on p.id_vendor=v.id left join kategoriproduk kp on p.id_kategori = kp.id where 1 ${
    id ? "and p.id=?" : ""
  } ${kategori ? `and id_kategori = ?` : ""} ${
    nama ? "and p.nama like ?" : ""
  } and p.tanggal >= '2025-01-01' ${
    isReadyStock ? "and stok>0" : ""
  } order by p.tanggal desc, kategoriproduk, nama, m.nama, p.id ${
    limit ? "limit ?" : ""
  }`;
  const values = [];
  if (id) values.push(id);
  if (kategori) values.push(kategori);
  if (nama) values.push(nama);
  if (limit) values.push(limit);
  const [results] = await pool.execute(sql, values);
  return results;
};

const listKategori = async () => {
  const sql = `select distinct kategori from ${table}`;
  const values = [];
  const [results] = await pool.execute(sql, values);
  return results;
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

/**
 * @returns {Promise<{ kategoriInsertId: number,
 * merekInsertId: number,
 * vendorInsertId: number,
 * produkInsertId: number,
 * produkMasukInsertId: number, }>}
 */
const insertProduk = async ({
  id_kategori = null,
  id_kustom = "",
  nama = "",
  id_merek = null,
  tipe = "",
  id_vendor = null,
  stok = 0,
  satuan = "",
  hargamodal = 0,
  hargajual = 0,
  tanggal = null,
  jatuhtempo = null,
  terbayar = 0,
  lunas = 0,
  keterangan = "",
  kategoriproduk = "",
  merek = "",
  vendor = "",
  alamat = "",
  conn = null,
}) => {
  let sql, values;
  try {
    if (!conn && !conn.__inTransaction)
      throw new Error(
        "insertProduk() must be called inside transaction. Set conn.__inTransacation to true after transaction begin."
      );
    // if (!nama) throw new Error("Nama belum diisi.");
    if (!satuan) throw new Error("Satuan belum diisi.");
    if (kategoriproduk && !id_kategori) {
      id_kategori = await createKategori({ nama: kategoriproduk, conn });
    }
    if (merek && !id_merek) {
      id_merek = await createMerek({ nama: merek, conn });
    }
    if (vendor && !id_vendor) {
      id_vendor = await createVendor({ nama: vendor, alamat, conn });
    }
    sql = `insert into ${table} (id_kategori, id_kustom, nama, id_merek, tipe, stok, satuan, hargamodal, hargajual, tanggal, keterangan, manualinput) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`;
    values = [
      id_kategori,
      id_kustom,
      nama ? nama : tipe,
      id_merek ?? 0,
      tipe,
      stok,
      satuan,
      hargamodal,
      hargajual,
      tanggal,
      keterangan ?? "",
    ];
    const [result1] = await conn.execute(sql, values);
    let result2 = null;
    if (stok > 0) {
      sql = `insert into produkmasuk (id_produk, jumlah, harga, tanggal, jatuhtempo, terbayar, id_vendor) values (?, ?, ?, ?, ?, ?, ?)`;
      values = [
        result1.insertId,
        stok,
        hargamodal,
        tanggal,
        jatuhtempo ?? null,
        lunas == "1" ? stok * hargamodal : terbayar,
        id_vendor,
      ];
      [result2] = await conn.execute(sql, values);
    }
    let finalResult = {
      kategoriInsertId: id_kategori,
      merekInsertId: id_merek,
      vendorInsertId: id_vendor,
      produkInsertId: result1.insertId,
      produkMasukInsertId: result2?.insertId,
    };
    return finalResult;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const create = async (rest, fn) => {
  try {
    const result = await withTransaction(pool, async (conn) => {
      const finalResult = await insertProduk({ ...rest, conn });
      if (fn) {
        const result = await fn(conn, finalResult);
        if (result && typeof result === "object")
          finalResult = { ...finalResult, ...result };
      }
      return finalResult;
    });
    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const update = async ({ id, ...rest }) => {
  const allowedFields = [
    "id_kustom",
    "id_kategori",
    "nama",
    "id_merek",
    "tipe",
    "satuan",
    "hargamodal",
    "hargajual",
    "tanggal",
    "keterangan",
  ];
  const fields = [];
  const values = [];
  const isExist = (v) => v != null;
  try {
    const result = await withTransaction(pool, async (conn) => {
      if (rest.kategoriproduk && !rest.id_kategori) {
        rest.id_kategori = await createKategori({
          nama: rest.kategoriproduk,
          conn,
        });
      }
      if (rest.merek && !rest.id_merek) {
        rest.id_merek = await createMerek({ nama: rest.merek, conn });
      }
      for (const [key, value] of Object.entries(rest)) {
        if (allowedFields.includes(key) && value != null) {
          fields.push(`${key}=?`);
          values.push(value);
        }
      }
      if (fields.length === 0)
        return { affectedRows: 0, message: "No fields to update" };
      values.push(id);
      const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
      const [result] = await conn.execute(sql, values);
      return {
        insertKategoriId: rest.id_kategori,
        insertMerekId: rest.id_merek,
        insertProdukId: result.insertId,
      };
    });
    return result;
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

module.exports = { list, insertProduk, create, update, destroy, listKategori };
