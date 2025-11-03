const connection = require("./db.cjs");
const { pool } = require("./db.2.0.0.cjs");
const { insertProduk } = require("./produk.cjs");
const {
  assertTransaction,
  withTransaction,
} = require("../helpers/transaction.cjs");
const table = "keranjangproyek";

const list = ({ id_proyek, instalasi, versi }) => {
  const sql = `Select sp.id id_subproyek, sp.nama subproyek, kpr.nama kategoriproduk, kp.id id_keranjangproyek, kp.jumlah, kp.hargamodal temphargamodal, kp.harga, kp.hargakustom, kp.instalasi, kp.showmerek, kp.showtipe, kp.keterangan, m.nama nmerek, v.nama nvendor, p.id id_produk, p.nama, p.stok, p.tipe, p.hargamodal, p.satuan From ${table} kp 
  left join subproyek sp on kp.id_subproyek = sp.id 
  left join produk p on kp.id_produk = p.id 
  left join kategoriproduk kpr on p.id_kategori=kpr.id 
  left join merek m on p.id_merek=m.id 
  left join vendor v on p.id_vendor=v.id where 1=1 ${
    id_proyek ? `and kp.id_proyek=?` : ""
  } ${instalasi ? `and instalasi = ?` : ""} and versi=?`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (instalasi) values.push(instalasi);
  values.push(versi);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      console.log(err);
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const listVersion = ({ id_proyek }) => {
  const sql = `select distinct versi from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  }`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

/**
 * @returns {Promise<{
 *   keranjangProyekInsertId: number;
 *   produkInsertId: number;
 * }>}
 */
const insertKeranjangProyek = async ({
  produk,
  id_produk,
  id_proyek,
  id_subproyek = null,
  jumlah,
  hargamodal = 0,
  harga = 0,
  hargakustom = 0,
  instalasi = 0,
  keterangan = "",
  versi = 1,
  conn,
  ...rest
}) => {
  assertTransaction(conn, insertKeranjangProyek.name);
  if (!id_produk && !produk) throw new Error(`Produk Belum Dipilih`);
  if (!jumlah) throw new Error(`Jumlah Belum Diisi`);
  if (!id_produk && produk)
    id_produk = (
      await insertProduk({
        ...rest,
        nama: produk,
        hargamodal,
        hargajual: harga,
        tanggal: new Date(),
        conn,
      })
    )?.produkInsertId;
  const sql = `insert into ${table} (id_produk, id_proyek, id_subproyek, jumlah, hargamodal, harga, hargakustom, instalasi, keterangan, versi) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [
    id_produk,
    id_proyek,
    id_subproyek || null,
    jumlah,
    hargamodal ?? 0,
    harga ?? 0,
    hargakustom,
    instalasi ?? 0,
    keterangan ?? "",
    versi,
  ];
  const [result] = await conn.execute(sql, values);
  return {
    keranjangProyekInsertId: result.insertId,
    produkInsertId: id_produk,
  };
};

const create = async (rest) => {
  try {
    // return rest;
    const result = await withTransaction(pool, async (conn) => {
      const res = await insertKeranjangProyek({ ...rest, conn });
      return res;
    });
    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const createNewVersion = ({ id_proyek, versi }) => {
  const sql = `INSERT INTO ${table} (id_proyek, id_produk, jumlah, harga, instalasi, keterangan, versi) SELECT id_proyek, id_produk, jumlah, harga, instalasi, keterangan, (SELECT max(versi) + 1 from keranjangproyek where id_proyek=?) FROM keranjangproyek WHERE id_proyek=? and versi=?`;
  const values = [id_proyek, id_proyek, versi];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};
const update = ({
  id,
  id_subproyek = null,
  jumlah,
  hargamodal,
  harga,
  hargakustom,
  keterangan,
  showmerek,
  showtipe,
}) => {
  console.log(id_subproyek);
  const isExist = (v) => v !== undefined;
  const fields = [];
  const values = [];

  if (isExist(id_subproyek)) {
    fields.push("id_subproyek = ?");
    values.push(id_subproyek || null);
  }
  if (isExist(jumlah)) {
    fields.push("jumlah = ?");
    values.push(jumlah);
  }
  if (isExist(hargamodal)) {
    fields.push("hargamodal = ?");
    values.push(hargamodal);
  }
  if (isExist(harga)) {
    fields.push("harga = ?");
    values.push(harga);
  }
  if (isExist(hargakustom)) {
    fields.push("hargakustom = ?");
    values.push(hargakustom === "" ? null : hargakustom);
  }
  if (isExist(keterangan)) {
    fields.push("keterangan = ?");
    values.push(keterangan);
  }
  if (isExist(showmerek)) {
    fields.push("showmerek = ?");
    values.push(showmerek);
  }
  if (isExist(showtipe)) {
    fields.push("showtipe = ?");
    values.push(showtipe);
  }
  // ⛔ No fields to update
  if (fields.length === 0)
    return Promise.resolve({ affectedRows: 0, message: "No fields to update" });
  // Where clause
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      console.log(err);
      if (err) reject(err);
      resolve(res);
    });
  });
};

const updateHargaJualByPersenProvit = ({ id_proyek, persenProvit }) => {
  const sql = `UPDATE keranjangproyek SET harga = ceil(hargamodal*(1+?/100)) WHERE id_proyek = ?`;
  const values = [persenProvit, id_proyek];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      console.log(err);
      if (err) reject(err);
      resolve(res);
    });
  });
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

module.exports = {
  list,
  listVersion,
  create,
  createNewVersion,
  update,
  updateHargaJualByPersenProvit,
  insertKeranjangProyek,
  destroy,
};
