const connection = require("./db");
const connectionmq = require("./dbmq");
const table = "proyek";

const sqlIdPenawaran = `(select CASE WHEN EXISTS (SELECT 1 FROM ${table} where DATE_FORMAT(tanggal_penawaran, '%m %Y')=DATE_FORMAT(?, '%m %Y')) THEN (select id_penawaran + 1 from ${table} where DATE_FORMAT(tanggal_penawaran, '%m %Y')=DATE_FORMAT(?, '%m %Y') order by id_penawaran desc limit 1) ELSE 1 END AS result)`;

const list = ({
  id,
  id_instansi,
  start,
  end,
  sort,
  id_karyawan,
  countProgressNoOffer,
}) => {
  const validColumns = ["tanggal", "tanggal_penawaran"];
  if (sort)
    if (validColumns.includes(sort)) {
    } else {
      return new Promise((resolve, reject) => {
        reject({ message: "Kolom tidak valid" });
      });
    }
  console.log(id_karyawan);

  const sql = `Select p.*, sp.nama statusproyek, k.nama namakaryawan, pr.nama namaperusahaan, i.nama instansi, i.swasta, i.kota, mp.jumlahbarangkeluar, mp.pengeluaranproyek, kp.totalmodal, kp.totalpenawaran From ${table} p left join statusproyek sp on p.id_statusproyek = sp.id left join karyawan k on p.id_karyawan = k.id left join perusahaan pr on p.id_perusahaan = pr.id left join instansi i on p.id_instansi=i.id left join (SELECT id_proyek, sum(jumlah) jumlahbarangkeluar, sum(jumlah*harga) pengeluaranproyek FROM pengeluaranproyek group BY id_proyek) mp on p.id=mp.id_proyek left join (select id_proyek, sum(kp.jumlah*kp.harga) totalpenawaran, sum(kp.jumlah*p.hargamodal) totalmodal from keranjangproyek kp left join produk p on kp.id_produk=p.id group by id_proyek) kp on kp.id_proyek=p.id where 1=1 ${
    id ? `and p.id=?` : ""
  } ${id_instansi ? "and id_instansi=?" : ""} ${
    start ? `and p.${sort}>=?` : ""
  } ${end ? `and p.${sort}<=?` : ""} ${
    id_karyawan ? `and id_karyawan=?` : ""
  } ${
    countProgressNoOffer ? "and versi<=0 and pengeluaranproyek>0" : ""
  } order by 
    CASE 
      WHEN versi <=0 and jumlahbarangkeluar>0
      THEN 1
      ELSE 2 
    END ${
      sort
        ? `,p.${sort} desc, p.${
            sort == "tanggal" ? "tanggal_penawaran" : "tanggal"
          } desc`
        : ""
    }`;
  const values = [];
  if (id) values.push(id);
  if (id_instansi) values.push(id_instansi);
  if (start) values.push(start);
  if (end) values.push(end);
  if (id_karyawan) values.push(id_karyawan);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({
  id,
  id_perusahaan,
  id_instansi,
  nama,
  klien,
  id_karyawan,
  karyawan,
  id_statusproyek,
  tanggal,
  keterangan,
}) => {
  let sql = "";
  let values = [];
  // let sql = `select id_kustom from ${table} where DATE_FORMAT(tanggal, '%m %Y') = DATE_FORMAT(?, '%m %Y') order by id_kustom desc limit 1`;
  // let values = [tanggal];
  return new Promise((resolve, reject) => {
    // connection.query(sql, values, (err, res) => {
    //   if (err) reject(err);
    //   let id_kustom = 1;
    //   if (res.length > 0) {
    //     id_kustom = res[0].id_kustom + 1;
    //   }
    sql = `insert into ${table} (id_penawaran, id_instansi, id_perusahaan, nama, klien, id_karyawan, tanggal_penawaran, keterangan) select ${sqlIdPenawaran}, ?, ?, ?, ?, ${
      karyawan ? `(select id from karyawan where nama = ?)` : "?"
    }, ?, ?`;
    values = [
      tanggal,
      tanggal,
      id_instansi,
      id_perusahaan,
      nama,
      klien,
      karyawan ?? id_karyawan,
      tanggal,
      keterangan ?? "",
    ];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
    // });
  });
};

const update = ({
  id,
  id_instansi,
  id_second,
  id_perusahaan,
  nama,
  klien,
  id_karyawan,
  id_statusproyek,
  tanggal,
  keterangan,
}) => {
  const sql = `update ${table} set id_second=?, id_instansi=?, id_perusahaan=?, nama=?, klien=?, id_karyawan=?, id_statusproyek=?, tanggal_penawaran=?, keterangan=? where id=?`;
  const values = [
    id_second,
    id_instansi,
    id_perusahaan,
    nama,
    klien,
    id_karyawan,
    id_statusproyek,
    tanggal,
    keterangan,
    id,
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const updateVersion = ({ id, versi, tanggal }) => {
  const sql = `update ${table} set versi=?, id_kustom=(select coalesce(id_kustom,((select id_kustom from proyek where id_kustom>0 and DATE_FORMAT(tanggal, '%m %Y')=DATE_FORMAT(?, '%m %Y') order by id_kustom desc limit 1)+1),1) from proyek where id=?), tanggal=? where id=?`;
  const values = [versi, tanggal, id, tanggal, id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from keranjangproyek where id_proyek = ?;delete from rekapitulasiproyek where id_proyek = ?; delete from ${table} where id = ?;`;
  const values = [id, id, id, id, id];
  return new Promise((resolve, reject) => {
    connectionmq.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const exportPenawaran = ({ id, start, end }) => {
  const sql = `select p.id id_proyek, p.nama namaproyek, p.id_Perusahaan idperusahaan, p.klien, p.tanggal tanggalproyek, pr.nama namaproduk, pr.hargamodal, pr.hargajual, pr.tanggal tanggalproduk, pr.tipe, pr.stok, pr.satuan, i.nama namainstansi, i.swasta, i.kota, i.alamat alamatinstansi, m.nama namamerek, v.nama namavendor, v.alamat alamatvendor, kp.versi, kp.jumlah, kp.harga, kp.hargakustom, kp.instalasi, k.nama namakaryawan, kpr.nama namakategoriproduk, rp.versi versirekapitulasiproyek, rp.diskon, rp.pajak, rp.audio, rp.cctv, rp.multimedia from keranjangproyek kp left join proyek p on kp.id_proyek=p.id left join produk pr on kp.id_produk = pr.id left join merek m on pr.id_merek=m.id left join vendor v on pr.id_vendor=v.id left join instansi i on p.id_instansi=i.id left join karyawan k on p.id_karyawan=k.id left join kategoriproduk kpr on pr.id_kategori=kpr.id left join rekapitulasiproyek rp on p.id=rp.id_proyek where 1=1 ${
    id ? "and id_proyek = ?" : ""
  } ${start ? "and p.tanggal>=?" : ""} ${end ? "and p.tanggal<=?" : ""}`;
  const values = [];
  if (id) values.push(id);
  if (start) values.push(start);
  if (end) values.push(end);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const importPenawaran = ({
  id_proyek,
  namaproyek,
  idperusahaan,
  tanggalproyek,
  klien,
  namaproduk,
  hargamodal,
  hargajual,
  tanggalproduk,
  tipe,
  stok,
  satuan,
  namainstansi,
  swasta,
  kota,
  alamatinstansi,
  namamerek,
  namavendor,
  alamatvendor,
  versi,
  jumlah,
  harga,
  hargakustom,
  instalasi,
  namakaryawan,
  namakategoriproduk,
  versirekapitulasiproyek,
  diskon,
  pajak,
}) => {
  return new Promise((resolve, reject) => {
    let table = "kategoriproduk";
    let sql = `INSERT INTO ${table} (nama, inputcode) SELECT ?, 'export' WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE nama = ?);`;
    let values = [namakategoriproduk, namakategoriproduk];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (err) console.log(table);
    });
    table = "merek";
    sql = `INSERT INTO ${table} (nama, inputcode) SELECT ?, 'export' WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE nama = ?);`;
    values = [namamerek, namamerek];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (err) console.log(table);
    });
    table = "vendor";
    sql = `INSERT INTO ${table} (nama, alamat, inputcode) SELECT ?,?, 'export' WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE nama = ? and alamat = ?);`;
    values = [namavendor, alamatvendor, namavendor, alamatvendor];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (err) console.log(table);
    });
    table = "produk";
    sql = `select id into @id_kategoriproduk from kategoriproduk where nama=?;select id into @id_merek from merek where nama=?;select id into @id_vendor from vendor where nama=? and alamat=?;INSERT INTO ${table} (nama, id_kategori, id_merek, id_vendor, tipe, stok, satuan, hargamodal, hargajual, tanggal, inputcode) SELECT ?,@id_kategoriproduk,@id_merek,@id_vendor,?,?,?,?,?,?, 'export' WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE nama = ? and id_kategori = @id_kategoriproduk and id_merek=@id_merek and id_vendor=@id_vendor and tanggal=? and hargamodal=? and hargajual=?);`;
    values = [
      namakategoriproduk,
      namamerek,
      namavendor,
      alamatvendor,
      namaproduk,
      tipe,
      stok,
      satuan,
      hargamodal,
      hargajual,
      tanggalproduk,
      namaproduk,
      tanggalproduk,
      hargamodal,
      hargajual,
    ];
    connectionmq.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (err) console.log(table);
    });
    table = "instansi";
    sql = `insert into ${table} (nama, alamat, swasta, kota, inputcode) select ?,?,?,?,'export' where not exists (select 1 from ${table} where nama=? and alamat=?)`;
    values = [
      namainstansi,
      alamatinstansi,
      swasta,
      kota,
      namainstansi,
      alamatinstansi,
    ];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (err) console.log(table);
    });
    table = "karyawan";
    sql = `insert into ${table} (nama, inputcode) select ?,'export' where not exists (select 1 from ${table} where nama=?)`;
    values = [namakaryawan, namakaryawan];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (err) console.log(table);
    });
    table = "proyek";
    sql = `insert into ${table} (id_penawaran, id_perusahaan, id_instansi, nama, klien, id_karyawan, tanggal, inputcode) select (select coalesce(id_penawaran+1,1) from ${table} where DATE_FORMAT(tanggal, '%m %Y')=DATE_FORMAT(?, '%m %Y') order by id_penawaran desc limit 1),?,(select id from instansi where nama=? and alamat=?),?,?,(select id from karyawan where nama=?),?,'export' where not exists (select 1 from ${table} where id_perusahaan=? and id_instansi=(select id from instansi where nama=? and alamat=?) and nama=? and klien=? and id_karyawan=(select id from karyawan where nama=?) and tanggal=?)`;
    values = [
      tanggalproyek,
      idperusahaan,
      namainstansi,
      alamatinstansi,
      namaproyek,
      klien,
      namakaryawan,
      tanggalproyek,
      idperusahaan,
      namainstansi,
      alamatinstansi,
      namaproyek,
      klien,
      namakaryawan,
      tanggalproyek,
    ];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (err) console.log(table);
    });
    table = "keranjangproyek";
    sql = `insert into ${table} (id_proyek, id_produk, versi, jumlah, harga, hargakustom, instalasi, inputcode) select (select id from proyek where id_perusahaan=? and id_instansi=(select id from instansi where nama=? and alamat=?) and nama=? and klien=? and id_karyawan=(select id from karyawan where nama=?) and tanggal=?),(select id from produk where nama=? and tanggal=?),?,?,?,?,?,'export'`;
    values = [
      idperusahaan,
      namainstansi,
      alamatinstansi,
      namaproyek,
      klien,
      namakaryawan,
      tanggalproyek,
      namaproduk,
      tanggalproduk,
      versi,
      jumlah,
      harga,
      hargakustom,
      instalasi,
    ];
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (err) console.log(table);
    });
    table = "rekapitulasiproyek";
    sql = `select id into @id_proyek from proyek where id_perusahaan=? and id_instansi=(select id from instansi where nama=? and alamat=?) and nama=? and klien=? and id_karyawan=(select id from karyawan where nama=?) and tanggal=? limit 1;
    insert into ${table} (id_proyek, versi, diskon, pajak, inputcode) select @id_proyek,?,?,?,'export' where not exists (select 1 from ${table} where id_proyek=@id_proyek and versi=?);`;
    values = [
      idperusahaan,
      namainstansi,
      alamatinstansi,
      namaproyek,
      klien,
      namakaryawan,
      tanggalproyek,
      versirekapitulasiproyek,
      diskon,
      pajak,
      versirekapitulasiproyek,
    ];
    connectionmq.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (err) console.log("error" + table);
    });
    setTimeout(() => {
      resolve({ msg: "Sukses" });
    }, 100);
  });
};

module.exports = {
  list,
  create,
  update,
  updateVersion,
  destroy,
  exportPenawaran,
  importPenawaran,
};
