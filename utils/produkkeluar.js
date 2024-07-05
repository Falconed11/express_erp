const pool = require("./dbpromise");

const table = "produkkeluar";

const list = async ({ id_produk }) => {
  const connection = await pool.getConnection();
  try {
    let sql = `select p.nama produk, p.tipe tipe, p.stok, p.satuan, m.nama merek, v.nama vendor, pk.* from ${table} pk left join produk p on p.id=pk.id_produk left join merek m on m.id=p.id_merek left join vendor v on v.id=p.id_vendor where 1 ${
      id_produk ? `and pk.id_produk=?` : ""
    }`;
    let values = [];
    if (id_produk) values.push(id_produk);
    const [result] = await connection.execute(sql, values);
    return result;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};
const create = async ({
  id_produk,
  sn,
  metodepengeluaran,
  serialnumbers,
  jumlah,
  harga,
  tanggal,
  keterangan,
}) => {
  console.log({ jumlah });
  jumlah = jumlah ?? 0;
  if (sn == 0) if (jumlah == 0) throw new Error("Jumlah tidak boleh 0!");
  harga = harga ?? 0;

  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    if (sn == 1) {
      for (let i = 0; i < serialnumbers.length; i++) {
        let sql = `select id from produkmasuk where jumlah > keluar and id_produk = ? order by harga desc limit 1`;
        let values = [id_produk];
        let [value] = await connection.execute(sql, values);
        const produkmasuk = value[0];
        sql = `update produkmasuk set keluar = keluar + 1 where id = ${produkmasuk.id}`;
        values = [];
        [result] = await connection.execute(sql, values);
        sql = `update produk set stok = stok - 1 where id = ?`;
        values = [id_produk];
        [result] = await connection.execute(sql, values);
        sql = `insert into ${table} (id_produk, id_produkmasuk, metodepengeluaran, sn, jumlah, harga, tanggal, keterangan) values (?,?,?,?,'1',?,?,?)`;
        values = [
          id_produk,
          produkmasuk.id,
          metodepengeluaran,
          serialnumbers[i].value,
          harga,
          tanggal,
          keterangan,
        ];
        [result] = await connection.execute(sql, values);
      }
    } else {
      let sisa = jumlah;
      while (sisa > 0) {
        let sql = `select id, (jumlah - keluar) stok from produkmasuk where jumlah > keluar and id_produk = ?  order by harga desc limit 1`;
        let values = [id_produk];
        let [result] = await connection.execute(sql, values);
        const produkmasuk = result[0];
        const stok = produkmasuk.stok;
        console.log({ stok });
        const keluar = sisa >= stok ? stok : sisa;
        sisa -= keluar;
        const idProdukMasuk = produkmasuk.id;

        console.log({ keluar });

        sql = `update produkmasuk set keluar = keluar + ? where id = ${idProdukMasuk}`;
        values = [keluar];
        [result] = await connection.execute(sql, values);

        sql = `update produk set stok = stok - ? where id = ?`;
        values = [keluar, id_produk];
        [result] = await connection.execute(sql, values);

        sql = `insert into ${table} (metodepengeluaran, id_produk, id_produkmasuk, jumlah, harga, tanggal, keterangan) values (?,?,?,?,?,?,?)`;
        values = [
          metodepengeluaran,
          id_produk,
          idProdukMasuk,
          keluar,
          harga,
          tanggal,
          keterangan,
        ];
        [result] = await connection.execute(sql, values);
      }
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
const update = async ({ id, sn, harga, metodepengeluaran, tanggal }) => {
  if (!harga) harga = 0;
  const connection = await pool.getConnection();
  try {
    // Start the transaction
    await connection.beginTransaction();

    let sql = `update ${table} set sn=?, harga=?, metodepengeluaran=?, tanggal=? where id=?`;
    let values = [sn, harga, metodepengeluaran, tanggal, id];
    const [result1] = await connection.execute(sql, values);

    // sql = `update produk set stok=stok + ? where id = ?`;
    // values = [jumlah - oldJumlah, id_produk];
    // const [result2] = await connection.execute(sql, values);

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
const destroy = async ({ id, id_produk, id_produkmasuk, jumlah }) => {
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    let sql = `delete from ${table} where id = ?`;
    let values = [id];
    const [result1] = await connection.execute(sql, values);

    sql = `update produkmasuk set keluar=keluar - ? where id = ?`;
    values = [jumlah, id_produkmasuk];
    const [result2] = await connection.execute(sql, values);

    sql = `update produk set stok=stok + ? where id = ?`;
    values = [jumlah, id_produk];
    const [result3] = await connection.execute(sql, values);

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
