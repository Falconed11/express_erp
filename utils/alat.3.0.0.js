const mysql = require("mysql2/promise");

const inputcode = "data2023";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "erp",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  multipleStatements: true, // Enable multiple statements
});

const runTransaction = async (connection, insertRow, json) => {
  const finalresult = [];
  try {
    await connection.beginTransaction();

    for (let i = 0; i < json.length; i++) {
      const result = await insertRow(json[i]);
      finalresult.push(result);
    }

    await connection.commit();
    console.log("All rows inserted successfully.");
  } catch (err) {
    await connection.rollback();
    console.error("Error inserting rows, transaction rolled back:", err);
    return { result: finalresult, err };
  } finally {
    await connection.release();
  }

  return finalresult;
};

const importPengeluaranProyek = async (json) => {
  const connection = await pool.getConnection();
  const insertRow = async (row) => {
    let {
      nama,
      swasta,
      id_second,
      jenis_proyek,
      tanggal,
      nilai,
      keterangan,
      nama_karyawan,
      vendor,
      merek,
      tipe,
      harga_satuan,
      lunas,
      nama_barang,
      jumlah,
    } = row;
    let id_kustom = id_second?.split(".")[2];
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
    nama_barang = nama_barang ?? "";
    harga_satuan = harga_satuan ?? "";
    tanggal = tanggal ?? "";
    jumlah = jumlah ?? "";

    const isExpense = nama_barang ? 1 : 0;

    let sql = "";
    let values = [];
    let result;
    const finalresult = [];

    try {
      sql = `INSERT INTO instansi (nama, swasta, inputcode) SELECT ?, ?,'${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM instansi WHERE nama = ?);`;
      values = [nama, swasta, nama];
      [result] = await connection.query(sql, values);
      console.log(1);

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
      [result] = await connection.query(sql, values);
      console.log(2);
      if (isExpense) {
        sql = `INSERT INTO karyawan (nama, inputcode) SELECT ?, '${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM karyawan WHERE nama = ?);`;
        values = [nama_karyawan, nama_karyawan];
        [result] = await connection.query(sql, values);
        console.log(3);

        sql = `INSERT INTO vendor (nama, inputcode) SELECT ?, '${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM vendor WHERE nama = ?);`;
        values = [vendor, vendor];
        [result] = await connection.query(sql, values);

        console.log(4);
        sql = `INSERT INTO merek (nama, inputcode) SELECT ?, '${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM merek WHERE nama = ?);`;
        values = [merek, merek];
        [result] = await connection.query(sql, values);
        console.log(5);

        sql = `INSERT INTO produk (nama, id_merek, tipe, hargamodal, tanggal, inputcode) SELECT ?,(select id from merek where nama=?),?,?,?,'${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM produk WHERE nama = ? and id_merek=(select id from merek where nama=?) and hargamodal=?);`;
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
        [result] = await connection.query(sql, values);
        console.log(6);

        sql = `INSERT INTO pengeluaranproyek (id_proyek, tanggal, id_karyawan, id_produk, id_vendor, jumlah, harga, lunas, inputcode) SELECT (select id from proyek where id_second=? limit 1),?,(select id from karyawan where nama=? limit 1),(select id from produk where nama=? and id_merek=(select id from merek where nama=?) and tipe=? and hargamodal=? limit 1),(select id from vendor where nama=? limit 1),?,?,?,'${inputcode}';`;
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
        [result] = await connection.query(sql, values);
        console.log(7);
      }
      finalresult.push(`Sukses`);
    } catch (error) {
      finalresult.push(error);
      throw error;
    }
    return finalresult;
  };
  return runTransaction(connection, insertRow, json);
};

const importPembayaranProyek = async (json) => {
  const connection = await pool.getConnection();
  const insertRow = async (row) => {
    let { id_second, nominal, carabayar, tanggal, keterangan } = row;
    id_second = id_second ?? "";
    nominal = nominal ?? 0;
    carabayar = carabayar ?? "";
    tanggal = tanggal ?? "";
    keterangan = keterangan ?? "";

    let sql = "";
    let values = [];
    let result;
    const finalresult = [];

    try {
      sql = `INSERT INTO metodepembayaran (nama, inputcode) SELECT ?,'${inputcode}'  WHERE NOT EXISTS (SELECT 1 FROM metodepembayaran WHERE nama = ?);`;
      values = [carabayar, carabayar];
      [result] = await connection.query(sql, values);
      console.log(1);

      sql = `insert into pembayaranproyek (id_proyek, nominal, id_metodepembayaran, tanggal, keterangan, inputcode) select (select id from proyek where id_second=?),?,(select id from metodepembayaran where nama=?),?,?,'${inputcode}'`;
      values = [id_second, nominal, carabayar, tanggal, keterangan];
      [result] = await connection.query(sql, values);
      console.log(2);

      finalresult.push(`Sukses`);
    } catch (error) {
      finalresult.push(error);
      console.log;
      throw error;
    }
    return finalresult;
  };
  return runTransaction(connection, insertRow, json);
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
