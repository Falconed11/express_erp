const db = require("./db.2.0.0");
const pool = db.pool;

const table = "produkkeluar";

const list = async ({ id_produk }) => {
  const connection = await pool.getConnection();
  try {
    let sql = `select p.nama produk, p.tipe tipe, p.stok, p.satuan, pm.harga hargaprodukmasuk, m.nama merek, v.nama vendor, pk.*, pr.id id_proyek, pr.nama nama_proyek, i.nama nama_instansi from ${table} pk 
    left join produk p on p.id=pk.id_produk 
    left join produkmasuk pm on pm.id=pk.id_produkmasuk 
    left join merek m on m.id=p.id_merek 
    left join vendor v on v.id=p.id_vendor 
    left join proyek pr on pr.id=pk.id_proyek 
    left join instansi i on i.id=pr.id_instansi where 1 ${
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
  isSelected,
  idproyek,
  id_proyek,
  karyawan,
  id_karyawan,
  idproduk,
  status,
}) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await queryCreate({
      connection,
      id_produk,
      sn,
      metodepengeluaran,
      serialnumbers,
      jumlah,
      harga,
      tanggal,
      keterangan,
      isSelected,
      idproyek,
      id_proyek,
      karyawan,
      id_karyawan,
      idproduk,
      status,
    });

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
  sn,
  id_produkmasuk,
  id_produk,
  oldJumlah,
  harga,
  metodepengeluaran,
  tanggal,

  jumlah,
  keterangan,
  // isSelected,
  idproyek,
  id_proyek,
  karyawan,
  id_karyawan,
  idproduk,
}) => {
  if (!harga) harga = 0;
  const connection = await pool.getConnection();
  try {
    // Start the transaction
    await connection.beginTransaction();
    let sql, values;
    if (metodepengeluaran != "proyek") {
      sql = `update ${table} set sn=?, harga=?, metodepengeluaran=?, tanggal=? where id=?`;
      values = [sn, harga, metodepengeluaran, tanggal, id];
      const [result1] = await connection.execute(sql, values);
    } else {
      const isSelected = true;
      await queryDelete({
        connection,
        id,
        jumlah: oldJumlah,
        id_produkmasuk,
        id_produk,
        metodepengeluaran,
      });
      await queryCreate({
        connection,
        id_produk,
        // sn,
        // metodepengeluaran,
        // serialnumbers,
        jumlah,
        harga,
        tanggal,
        keterangan,
        isSelected,
        // idproyek,
        id_proyek,
        // karyawan,
        id_karyawan,
        // idproduk
      });
    }

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
// const update2 = async () => {};
const destroy = async ({
  id,
  id_produk,
  id_produkmasuk,
  jumlah,
  metodepengeluaran,
}) => {
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    await queryDelete({
      connection,
      id,
      id_produk,
      id_produkmasuk,
      jumlah,
      metodepengeluaran,
    });

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

const queryCreate = async ({
  connection,
  id_produk,
  sn,
  metodepengeluaran,
  serialnumbers,
  jumlah,
  harga,
  tanggal,
  keterangan,
  isSelected,
  idproyek,
  id_proyek,
  karyawan,
  id_karyawan,
  idproduk,
  status,
}) => {
  jumlah = jumlah ?? 0;
  if (!sn || sn == 0)
    if (!jumlah || jumlah == 0) throw new Error("Jumlah tidak boleh 0!");
  harga = harga ?? 0;
  keterangan = keterangan ?? "";
  id_karyawan = id_karyawan ?? 0;
  // Start the transaction

  let sql, values, result;
  sql = "select stok, satuan from produk where id=?";
  values = [id_produk];
  [result] = await connection.execute(sql, values);
  const produk = result[0];
  const stok = produk.stok;
  const satuan = produk.satuan;
  if (jumlah > stok)
    throw new Error(`Stok tidak mencukupi. Maks. ${stok} ${satuan}.`);
  if (sn == 1) {
    for (let i = 0; i < serialnumbers.length; i++) {
      let sql = `select id from produkmasuk where jumlah > keluar and id_produk = ? order by harga desc limit 1`;
      let values = [id_produk];
      let [value] = await connection.execute(sql, values);
      const produkmasuk = value[0];
      sql = `update produkmasuk set keluar = keluar + 1 where id = ?`;
      values = [produkmasuk.id];
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
      sql = `select id, (jumlah - keluar) stok, harga, id_vendor from produkmasuk where jumlah > keluar and id_produk = ?  order by harga desc limit 1`;
      values = [id_produk];
      console.log(values);
      [result] = await connection.execute(sql, values);
      const produkmasuk = result[0];
      const stok = produkmasuk.stok;
      const keluar = sisa >= stok ? stok : sisa;
      sisa -= keluar;
      const idProdukMasuk = produkmasuk.id;

      sql = `update produkmasuk set keluar = keluar + ? where id = ?`;
      values = [keluar, idProdukMasuk];
      console.log(values);
      [result] = await connection.execute(sql, values);

      sql = `update produk set stok = stok - ? where id = ?`;
      values = [keluar, id_produk];
      console.log(values);
      [result] = await connection.execute(sql, values);

      sql = `insert into ${table} (metodepengeluaran, id_produk, id_produkmasuk, id_proyek, jumlah, harga, tanggal, keterangan) values (?,?,?,?,${keluar},?,?,?)`;
      values = [
        metodepengeluaran ?? "proyek",
        id_produk,
        idProdukMasuk,
        id_proyek || null,
        isSelected == true ? produkmasuk.harga : harga ?? 0,
        tanggal,
        keterangan,
      ];
      console.log(values);
      [result] = await connection.execute(sql, values);

      if (isSelected == true) {
        sql = `insert into pengeluaranproyek (id_proyek, tanggal, id_karyawan, id_produk, id_produkkeluar, id_vendor, jumlah, harga, status, keterangan) values (${
          idproyek ? `(select id from proyek where id_second=?)` : `?`
        }, ?, ${karyawan ? `(select id from karyawan where nama=?)` : `?`}, ${
          idproduk ? `(select id from produk where id_kustom=?)` : `?`
        }, ${result.insertId}, ${produkmasuk.id_vendor}, ${keluar}, ?, 1, ?)`;
        const values = [
          idproyek ?? id_proyek,
          tanggal,
          karyawan ?? id_karyawan,
          idproduk ?? id_produk ?? "",
          produkmasuk.harga,
          keterangan ?? "",
        ];
        console.log(values);
        [result] = await connection.execute(sql, values);
      }
    }
  }
};
const queryDelete = async ({
  connection,
  id,
  jumlah,
  id_produkmasuk,
  id_produk,
  metodepengeluaran,
}) => {
  let [sql, values] = ["", ""];
  sql = `select * from ${table} where id = ?`;
  values = [id];
  const [test] = await connection.execute(sql, values);

  if (test.length == 0) throw new Error("Produk masuk telah terhapus.");

  sql = `delete from ${table} where id = ?`;
  values = [id];
  const [result1] = await connection.execute(sql, values);

  if (metodepengeluaran == "proyek") {
    sql = `delete from pengeluaranproyek where id_produkkeluar = ?`;
    values = [id];
    const [result4] = await connection.execute(sql, values);
  }

  sql = `update produkmasuk set keluar=keluar - ? where id = ?`;
  values = [jumlah, id_produkmasuk];
  const [result2] = await connection.execute(sql, values);

  sql = `update produk set stok=stok + ? where id = ?`;
  values = [jumlah, id_produk];
  const [result3] = await connection.execute(sql, values);
};

module.exports = { list, create, update, destroy };
