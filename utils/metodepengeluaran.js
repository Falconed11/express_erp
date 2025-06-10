const pool = require("./db.2.0.0");

const table = "metodepengeluaran";

const list = async ({ metodepengeluaran }) => {
  const connection = await pool.getConnection();
  try {
    const sql = `select nama from ${table} where 1 ${
      metodepengeluaran ? "and nama = ?" : ""
    } and nama != 'proyek'`;
    const values = [];
    if (metodepengeluaran) values.push(metodepengeluaran);
    const [result] = await connection.execute(sql, values);
    return result;
  } catch (error) {
    throw error;
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
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
  if (jumlah == 0) throw new Error("Jumlah tidak boleh 0!");
  harga = harga ?? 0;
  terbayar = terbayar ?? 0;
  jatuhtempo = jatuhtempo ?? null;
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

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
    const [result1] = await connection.execute(sql, values);

    sql = `update produk set stok = stok + ? where id=?;`;
    values = [jumlah, id_produk];
    const [result2] = await connection.execute(sql, values);

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
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    let sql = `update ${table} set id_produk=?, jumlah=?, harga=?, id_vendor=?, tanggal=?, terbayar=?, jatuhtempo=? where id=?`;
    let values = [
      id_produk,
      jumlah,
      harga,
      id_vendor,
      tanggal,
      lunas == "1" ? jumlah * harga : terbayar,
      lunas == 0 ? jatuhtempo : null,
      id,
    ];
    const [result1] = await connection.execute(sql, values);

    sql = `update produk set stok=stok + ? where id = ?`;
    values = [jumlah - oldJumlah, id_produk];
    const [result2] = await connection.execute(sql, values);

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
const destroy = async ({ id, id_produk, jumlah }) => {
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    let sql = `delete from ${table} where id = ?`;
    let values = [id];
    const [result1] = await connection.execute(sql, values);

    sql = `update produk set stok=stok - ? where id = ?`;
    values = [jumlah, id_produk];
    const [result2] = await connection.execute(sql, values);

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

module.exports = { list, create, update, destroy };
