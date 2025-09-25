const connection = require("./db.cjs");
const table = "proyek";

const inputcode = "data2023";

const importPengeluaranProyek = ({
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
  let sql = "";
  let values = [];
  const isExpense = nama_barang ? 1 : 0;
  return new Promise((resolve, reject) => {
    // sql =
    //   "INSERT INTO kategoriproyek (nama) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM kategoriproyek WHERE nama = ?);";
    // values = [jenis_proyek, jenis_proyek];
    // connection.query(sql, values, (err, res) => {
    //   if (err) {
    //     console.log(`kategoriproyek ${err}`);
    //     reject(err);
    //   }
    // });
    sql = `INSERT INTO instansi (nama, swasta, inputcode) SELECT ?, ?,'${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM instansi WHERE nama = ?);`;
    values = [nama, swasta, nama];
    connection.query(sql, values, (err, res) => {
      if (err) {
        console.log(`instansi ${err}`);
        reject(err);
      }
    });
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
    connection.query(sql, values, (err, res) => {
      if (err) {
        console.log(`proyek${err}`);
        reject(err);
      }
    });
    if (isExpense) {
      sql = `INSERT INTO karyawan (nama, inputcode) SELECT ?, '${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM karyawan WHERE nama = ?);`;
      values = [nama_karyawan, nama_karyawan];
      connection.query(sql, values, (err, res) => {
        if (err) {
          console.log(`karyawan ${err}`);
          reject(err);
        }
      });
      sql = `INSERT INTO vendor (nama, inputcode) SELECT ?, '${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM vendor WHERE nama = ?);`;
      values = [vendor, vendor];
      connection.query(sql, values, (err, res) => {
        if (err) {
          console.log(`vendor ${err}`);
          reject(err);
        }
      });
      sql = `INSERT INTO merek (nama, inputcode) SELECT ?, '${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM merek WHERE nama = ?);`;
      values = [merek, merek];
      connection.query(sql, values, (err, res) => {
        if (err) {
          console.log(`merek ${err}`);
          reject(err);
        }
      });
      sql = `INSERT INTO produk (nama, id_merek, id_vendor, tipe, hargamodal, tanggal, inputcode) SELECT ?,(select id from merek where nama=?),(select id from vendor where nama=?),?,?,?,'${inputcode}' WHERE NOT EXISTS (SELECT 1 FROM produk WHERE nama = ? and id_merek=(select id from merek where nama=?) and id_vendor=(select id from vendor where nama=?) and hargamodal=?);`;
      values = [
        nama_barang,
        merek,
        vendor,
        tipe,
        harga_satuan,
        tanggal,
        nama_barang,
        merek,
        vendor,
        harga_satuan,
      ];
      connection.query(sql, values, (err, res) => {
        if (err) {
          console.log(`produk ${err}`);
          reject(err);
        }
      });
      sql = `INSERT INTO pengeluaranproyek (id_proyek, tanggal, id_karyawan, id_produk, jumlah, harga, lunas, inputcode) SELECT (select id from proyek where id_second=?),?,(select id from karyawan where nama=?),(select id from produk where nama=? and id_merek=(select id from merek where nama=?) and id_vendor=(select id from vendor where nama=?) and tipe=? and hargamodal=?),?,?,?,'${inputcode}';`;
      values = [
        id_second,
        tanggal,
        nama_karyawan,
        nama_barang,
        merek,
        vendor,
        tipe,
        harga_satuan,
        jumlah,
        harga_satuan,
        lunas,
      ];
      connection.query(sql, values, (err, res) => {
        if (err) {
          console.log(`pengeluaranproyek ${err}`);
          reject(err);
        }
      });
    }
    setTimeout(() => {
      resolve({ msg: "Sukses" });
    }, 100);
  });
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
