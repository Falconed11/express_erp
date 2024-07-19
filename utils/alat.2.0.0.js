const pool = require("./dbpromise");

const inputcode = "data2023-2";

const importPengeluaranProyek = async ({
  nama_barang,
  nama_karyawan,
  jenis_proyek,
  vendor,
  merek,
  tipe,
  id_second,
  id_kustom,
  swasta,
  nilai,
  keterangan,
  nama,
  tanggal,
  jumlah,
  harga_satuan,
  lunas,
}) => {
  nama_karyawan = nama_karyawan ?? "";
  nama = nama ?? "";
  jenis_proyek = jenis_proyek ?? "";
  merek = merek ?? "";
  vendor = vendor ?? "";
  tipe = tipe ?? "";
  id_kustom = id_kustom ?? "";
  nilai = nilai ?? "";
  keterangan = keterangan ?? "";
  swasta = swasta ?? "";

  console.log({
    nama_barang,
    nama_karyawan,
    jenis_proyek,
    vendor,
    merek,
    tipe,
    id_second,
    id_kustom,
    swasta,
    nilai,
    keterangan,
    nama,
    tanggal,
    jumlah,
    harga_satuan,
    lunas,
  });

  const isExpense = nama_barang ? 1 : 0;
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    let sql = `INSERT INTO instansi (nama, swasta, inputcode) SELECT ?, ?,'${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM instansi WHERE nama = ?);`;
    let values = [nama, swasta, nama];
    let [result] = await connection.execute(sql, values);
    console.log(1);

    const insert_idInstansi = result.insertId;

    sql = `INSERT INTO proyek (id_second, id_kustom, nama, tanggal, id_instansi, id_statusproyek, versi, nilai, keterangan, inputcode) SELECT ?,?,?,?,(select id from instansi where nama = ?),'1','1',?,?,'${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM proyek WHERE id_second = ?);`;
    values = [
      id_second,
      id_kustom,
      jenis_proyek,
      tanggal,
      nama,
      nilai,
      keterangan,
      id_second,
    ];
    [result] = await connection.execute(sql, values);
    console.log(2);
    if (isExpense) {
      sql = `INSERT INTO karyawan (nama, inputcode) SELECT ?, '${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM karyawan WHERE nama = ?);`;
      values = [nama_karyawan, nama_karyawan];
      [result] = await connection.execute(sql, values);
      console.log(2);

      sql = `INSERT INTO vendor (nama, inputcode) SELECT ?, '${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM vendor WHERE nama = ?);`;
      values = [vendor, vendor];
      [result] = await connection.execute(sql, values);

      console.log(3);
      sql = `INSERT INTO merek (nama, inputcode) SELECT ?, '${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM merek WHERE nama = ?);`;
      values = [merek, merek];
      [result] = await connection.execute(sql, values);

      console.log(4);
      sql = `INSERT INTO produk (nama, id_merek, tipe, hargamodal, tanggal, inputcode) SELECT ?,(select id from merek where nama=?),?,?,?,'${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM produk WHERE nama = ? and id_merek=(select id from merek where nama=?) and id_vendor=(select id from vendor where nama=?) and hargamodal=?);`;
      values = [
        nama_barang,
        merek,
        tipe,
        harga_satuan,
        tanggal,
        nama_barang,
        merek,
        vendor,
        harga_satuan,
      ];
      [result] = await connection.execute(sql, values);

      console.log(5);
      sql = `INSERT INTO pengeluaranproyek (id_proyek, tanggal, id_karyawan, id_produk, id_vendor, jumlah, harga, lunas, inputcode) SELECT (select id from proyek where id_second=?),?,(select id from karyawan where nama=?),(select id from produk where nama=? and id_merek=(select id from merek where nama=?) and tipe=? and hargamodal=?),(select id from vendor where nama=?),?,?,?,'${inputcode}';`;
      values = [
        id_second,
        tanggal,
        nama_karyawan,
        nama_barang,
        merek,
        tipe,
        harga_satuan,
        vendor,
        jumlah,
        harga_satuan,
        lunas,
      ];
      [result] = await connection.execute(sql, values);
      console.log(6);
    }

    // If no errors, commit the transaction
    await connection.commit();
    console.log("Transaction committed successfully.");

    setTimeout(() => {
      return { message: "Sukses" };
    }, 100);
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

const importPembayaranProyek = ({
  id_second,
  nominal,
  carabayar,
  tanggal,
  keterangan,
}) => {
  nominal = nominal ?? 0;
  carabayar = carabayar ?? "";
  let sql = `INSERT INTO metodepembayaran (nama, inputcode) SELECT ?,'${inputcode}'  WHERE NOT EXISTS (SELECT 1 FROM metodepembayaran WHERE nama = ?);`;
  let values = [carabayar, carabayar];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      console.log(err);
    });
    sql = `insert into pembayaranproyek (id_proyek, nominal, id_metodepembayaran, tanggal, keterangan, inputcode) select (select id from proyek where id_second=?),?,(select id from metodepembayaran where nama=?),?,?,'${inputcode}'`;
    values = [id_second, nominal, carabayar, tanggal, keterangan];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      console.log(err);
    });
    setTimeout(() => {
      resolve({ msg: "Sukses" });
    }, 100);
    // resolve({ msg: "Import excel pembayaran proyek berhasil" });
  });
};

const importOperasionalKantor = ({ tanggal, transaksi, keterangan, biaya }) => {
  let sql = `INSERT INTO kategorioperasionalkantor (nama, inputcode) SELECT ?,'${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM kategorioperasionalkantor WHERE nama = ?);`;
  let values = [transaksi, transaksi];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      console.log(err);
    });
    sql = `insert into operasionalkantor (tanggal, id_kategorioperasionalkantor, keterangan, biaya, inputcode) select ?,(select id from kategorioperasionalkantor where nama =?),?,?,'${inputcode}'`;
    values = [tanggal, transaksi, keterangan, biaya];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      console.log(err);
    });
    setTimeout(() => {
      resolve({ msg: "Sukses" });
    }, 100);
    // resolve({ msg: "Import excel pembayaran proyek berhasil" });
  });
};

module.exports = {
  importPengeluaranProyek,
  importPembayaranProyek,
  importOperasionalKantor,
};
