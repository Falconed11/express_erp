const { pool } = require("./db.2.0.0.cjs");
const table = "produk";
const {
  withTransaction,
  assertTransaction,
} = require("./../helpers/transaction.cjs");
const { create: createKategori } = require("./kategoriproduk.cjs");
const { create: createMerek } = require("./merek.cjs");
const { create: createVendor } = require("./vendor.cjs");

const getIndonesiaDateTime = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
};

const list = async ({
  id,
  kategori,
  merek,
  limit,
  nama,
  isReadyStock,
  aktif,
}) => {
  if (nama) nama = "%" + nama + "%";
  const sql = `select count(distinct kpy.id_proyek) nkeranjangproyek, count(distinct pm.id) nprodukmasuk, count(distinct pp.id) npengeluaranproyek, kp.nama kategoriproduk, m.nama nmerek, v.nama nvendor, p.* from ${table} p
  left join merek m on p.id_merek=m.id
  left join vendor v on p.id_vendor=v.id
  left join kategoriproduk kp on p.id_kategori = kp.id
  left join keranjangproyek kpy on kpy.id_produk = p.id
  left join produkmasuk pm on pm.id_produk = p.id
  left join pengeluaranproyek pp on pp.id_produk = p.id
  where 1 ${id ? "and p.id=?" : ""} ${kategori ? `and id_kategori = ?` : ""} ${merek ? `and id_merek = ?` : ""} ${
    nama ? "and p.nama like ?" : ""
  } and p.tanggal >= '2025-01-01' ${isReadyStock ? "and stok>0" : ""} ${aktif ? `and p.aktif =?` : ""}
  group by p.id
  order by p.tanggal desc, kategoriproduk, nama, m.nama, p.id ${
    limit ? "limit ?" : ""
  }`;
  const values = [];
  if (id) values.push(id);
  if (kategori) values.push(kategori);
  if (merek) values.push(merek);
  if (nama) values.push(nama);
  if (aktif) values.push(aktif);
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
 * @returns {Promise<{
 *   kategoriInsertId: number | null;
 *   merekInsertId: number | null;
 *   vendorInsertId: number | null;
 *   produkInsertId: number;
 *   produkMasukInsertId?: number;
 * }>}
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
  terbayar = 0,
  lunas = 0,
  keterangan = "",
  kategoriproduk = "",
  merek = "",
  vendor = "",
  alamat = "",
  tanggal,
  tanggalMasuk,
  jatuhTempo = null,
  conn = null,
}) => {
  let sql, values;
  try {
    assertTransaction(conn, insertProduk.name);
    if (!tanggal) throw new Error("Tanggal belum diisi.");
    if (!satuan) throw new Error("Satuan belum diisi.");
    if (kategoriproduk && id_kategori == null) {
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
      id_merek ?? null,
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
        tanggalMasuk,
        jatuhTempo,
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
const transfer = async ({ curId, newId }) => {
  if (curId === newId) throw new Error("Cannot transfer to the same product");
  try {
    const result = withTransaction(pool, async (conn) => {
      const [produkMasuk] = await conn.execute(
        "select id_produk from produkmasuk where id_produk=? for update",
        [curId],
      );
      const [keranjangProyek] = await conn.execute(
        "select id_produk from keranjangproyek where id_produk=? for update",
        [curId],
      );
      const [pengeluaranProyek] = await conn.execute(
        "select id_produk from pengeluaranproyek where id_produk=? for update",
        [curId],
      );
      if (
        !produkMasuk.length &&
        !keranjangProyek.length &&
        !pengeluaranProyek.length
      )
        throw new Error(
          "Operasi dibatalkan! Produk tidak memiliki stok, penawaran, dan pengeluaran.",
        );
      const [products] = await conn.execute(
        "SELECT id, stok FROM produk WHERE id IN (?, ?) FOR UPDATE",
        [curId, newId],
      );
      const curProd = products.find((p) => p.id == curId);
      const targetProd = products.find((p) => p.id == newId);

      if (!curProd) throw new Error("Current product not found");
      if (!targetProd) throw new Error("Target product not found");

      const amountToTransfer = curProd.stok;

      await conn.execute(
        "update produkmasuk set id_produk=? where id_produk=?",
        [newId, curId],
      );
      await conn.execute(
        "update keranjangproyek set id_produk=? where id_produk=?",
        [newId, curId],
      );
      await conn.execute(
        "update pengeluaranproyek set id_produk=? where id_produk=?",
        [newId, curId],
      );
      await conn.execute("update produk set stok=stok+? where id=?", [
        amountToTransfer,
        newId,
      ]);
      await conn.execute("update produk set stok=0 where id=?", [curId]);
      return { message: "Transfer Sukses" };
    });
    return result;
  } catch (err) {
    console.error("Error : ", err.message);
    throw err;
  }
};
const normalizeAuditValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
};

const buildAuditEntries = ({
  id_produk,
  action,
  before = {},
  after = {},
  changed_by,
  changed_at,
}) => {
  const fields = [
    "id_kategori",
    "id_kustom",
    "nama",
    "id_merek",
    "tipe",
    "stok",
    "satuan",
    "hargamodal",
    "hargajual",
    "tanggal",
    "keterangan",
    "aktif",
  ];

  const changes = fields.reduce((acc, field) => {
    const beforeValue = normalizeAuditValue(before[field]);
    const afterValue = normalizeAuditValue(after[field]);

    if (beforeValue === afterValue) return acc;
    acc[field] = { before: beforeValue, after: afterValue };
    return acc;
  }, {});

  if (Object.keys(changes).length === 0) return [];
  return [
    {
      table_name: "produk",
      record_id: id_produk,
      action,
      changes,
      changed_by,
      changed_at,
    },
  ];
};

const writeAuditEntries = async (conn, entries) => {
  if (!entries || entries.length === 0) return [];
  const placeholders = entries.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
  const values = entries.flatMap((entry) => [
    entry.table_name,
    entry.record_id,
    entry.action,
    JSON.stringify(entry.changes),
    entry.changed_by ?? null,
    entry.changed_at || getIndonesiaDateTime(),
  ]);
  const sql = `INSERT INTO audit_log (table_name, record_id, action, changes, changed_by, changed_at) VALUES ${placeholders}`;
  await conn.execute(sql, values);
  return entries;
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
  try {
    const result = await withTransaction(pool, async (conn) => {
      const [beforeRows] = await conn.execute(
        `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
        [id],
      );
      const before = beforeRows[0] || {};

      if (rest.kategoriproduk && rest.id_kategori == null) {
        rest.id_kategori = await createKategori({
          nama: rest.kategoriproduk,
          conn,
        });
      }
      if (rest.merek && !rest.id_merek) {
        rest.id_merek = await createMerek({ nama: rest.merek, conn });
      }
      for (const [key, value] of Object.entries(rest)) {
        if (
          allowedFields.includes(key) &&
          (value != null || key === "id_merek")
        ) {
          fields.push(`${key}=?`);
          values.push(value);
        }
      }
      if (fields.length === 0)
        return { affectedRows: 0, message: "No fields to update" };
      values.push(id);
      const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
      const [result] = await conn.execute(sql, values);

      const [afterRows] = await conn.execute(
        `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
        [id],
      );
      const after = afterRows[0] || {};
      const auditEntries = buildAuditEntries({
        id_produk: id,
        action: "update",
        before,
        after,
        changed_by: rest.updated_by ?? rest.changed_by ?? null,
        changed_at: getIndonesiaDateTime(),
      });
      await writeAuditEntries(conn, auditEntries);
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
const destroy = async ({ id, changed_by = null }) => {
  const [beforeRows] = await pool.execute(
    `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
    [id],
  );
  const before = beforeRows[0] || {};

  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [results] = await pool.execute(sql, values);

  const after = Object.fromEntries(
    Object.keys(before).map((field) => [field, null]),
  );
  const entries = buildAuditEntries({
    id_produk: id,
    action: "delete",
    before,
    after,
    changed_by,
    changed_at: getIndonesiaDateTime(),
  });

  if (entries.length > 0) {
    const placeholders = entries.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const values = entries.flatMap((entry) => [
      entry.table_name,
      entry.record_id,
      entry.action,
      JSON.stringify(entry.changes),
      entry.changed_by ?? null,
      entry.changed_at || getIndonesiaDateTime(),
    ]);
    await pool.execute(
      `INSERT INTO audit_log (table_name, record_id, action, changes, changed_by, changed_at) VALUES ${placeholders}`,
      values,
    );
  }

  return results;
};

module.exports = {
  list,
  insertProduk,
  create,
  transfer,
  update,
  destroy,
  listKategori,
};
