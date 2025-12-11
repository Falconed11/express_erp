const { withTransaction } = require("../helpers/transaction.cjs");
const { pool } = require("./db.2.0.0.cjs");

const table = "produkmasuk";

const list = async ({ id_produk, laporan }) => {
  const sql = `select pm.*, (pm.jumlah*pm.harga-pm.terbayar) hutang, (pm.jumlah-pm.keluar) sisa, (pm.jumlah-pm.keluar)*pm.harga sisamodal, p.id_kustom, p.nama, p.tipe, p.satuan, p.hargamodal, p.stok, m.nama merek, v.nama vendor, kp.nama kategoriproduk from ${table} pm left join produk p on p.id=pm.id_produk left join merek m on m.id=p.id_merek left join vendor v on v.id=pm.id_vendor left join kategoriproduk kp on kp.id=p.id_kategori where 1 ${
    id_produk ? `and id_produk = ?` : ""
  } ${laporan ? "and (pm.jumlah-pm.keluar) > 0" : ""} order by ${
    laporan ? `kp.nama, p.nama,` : ""
  } pm.tanggal desc`;
  const values = [];
  if (id_produk) values.push(id_produk);
  const [rows] = await pool.execute(sql, values);
  return rows;
};
const create = async ({
  lunas,
  id_produk,
  id_vendor,
  jumlah,
  harga,
  terbayar,
  tanggal,
  jatuhtempo,
}) => {
  jumlah = jumlah ?? 0;
  if (jumlah <= 0) throw new Error("Jumlah tidak boleh 0!");
  if (!id_vendor) throw new Error("Vendor belum dipilih!");
  harga = harga ?? 0;
  terbayar = terbayar ?? 0;
  jatuhtempo = jatuhtempo ?? null;
  try {
    const result = await withTransaction(pool, async (conn) => {
      await conn.execute("select stok from produk where id =? for update", [
        id_produk,
      ]);
      let sql = `insert into ${table} (id_produk, id_vendor, jumlah, harga, terbayar, tanggal, jatuhtempo) values (?,?,?,?,?,?,?)`;
      let values = [
        id_produk,
        id_vendor,
        jumlah,
        harga,
        lunas == "1" ? jumlah * harga : terbayar,
        tanggal,
        lunas == "0" ? jatuhtempo : null,
      ];
      const [result1] = await conn.execute(sql, values);

      sql = `update produk set stok = stok + ? where id=?;`;
      values = [jumlah, id_produk];
      const [result2] = await conn.execute(sql, values);
      return { message: "Sukses" };
    });
    return result;
  } catch (err) {
    console.error("Error : ", err.message);
    throw err;
  }
};
const update = async ({
  id,
  id_produk,
  oldJumlah,
  jumlah,
  harga,
  id_vendor,
  tanggal,
  lunas,
  terbayar,
  jatuhtempo,
}) => {
  oldJumlah = oldJumlah ?? 0;
  jumlah = jumlah ?? 0;
  if (jumlah == 0) throw new Error("Jumlah tidak boleh 0!");
  harga = harga ?? 0;
  terbayar = terbayar ?? 0;
  jatuhtempo = jatuhtempo ?? null;
  try {
    const result = await withTransaction(pool, async (conn) => {
      await conn.execute("select * from produkmasuk where id=? for update", [
        id,
      ]);
      await conn.execute("select stok from produk where id=? for update", [
        id_produk,
      ]);
      let sql = `update ${table} set id_produk=?, jumlah=?, harga=?, id_vendor=?, tanggal=?, terbayar=?, jatuhtempo=? where id=?`;
      let values = [
        id_produk,
        jumlah,
        harga,
        id_vendor,
        tanggal,
        lunas == "1" ? jumlah * harga : terbayar,
        lunas == "0" ? jatuhtempo : null,
        id,
      ];
      const [result1] = await conn.execute(sql, values);
      sql = `update produk set stok=stok + ? where id = ?`;
      values = [jumlah - oldJumlah, id_produk];
      const [result2] = await conn.execute(sql, values);
      return { message: "Sukses" };
    });
    return result;
  } catch (err) {
    console.error("Error: ", err.message);
    throw err;
  }
};
const destroy = async ({ id, id_produk, jumlah }) => {
  try {
    const result = await withTransaction(pool, async (conn) => {
      let sql, values;
      sql = `select * from produkmasuk where id = ? for update`;
      values = [id];
      const [test] = await conn.execute(sql, values);
      await conn.execute("select stok from produk where id=? for update", [
        id_produk,
      ]);
      if (test.length == 0) throw new Error("Produk masuk telah terhapus.");
      sql = `delete from ${table} where id = ?`;
      values = [id];
      const [result1] = await conn.execute(sql, values);
      sql = `update produk set stok=stok - ? where id = ?`;
      values = [jumlah, id_produk];
      const [result2] = await conn.execute(sql, values);
      return { message: "Sukses" };
    });
    return result;
  } catch (err) {
    console.error("Error : ", err.message);
    throw err;
  }
};

module.exports = { list, create, update, destroy };
