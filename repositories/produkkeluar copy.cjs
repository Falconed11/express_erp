const {
  withTransaction,
  assertTransaction,
} = require("../helpers/transaction.cjs");
const { pool } = require("./db.2.0.0.cjs");

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
const create = async (rest) => {
  console.log(rest);
  try {
    const result = await withTransaction(pool, async (conn) => {
      const res = await queryCreate({ ...rest, conn });
      return res;
    });
    return result;
  } catch (err) {
    console.error("Error : ", err);
    throw err;
  }
};
const update = async ({
  id,
  sn = null,
  id_produkmasuk,
  id_produk,
  oldJumlah,
  harga = 0,
  metodepengeluaran,
  tanggal,
  ...rest
}) => {
  try {
    console.log({
      id,
      sn,
      id_produkmasuk,
      id_produk,
      oldJumlah,
      harga,
      metodepengeluaran,
      tanggal,
      ...rest,
    });
    // throw new Error("Test");
    const result = withTransaction(pool, async (conn) => {
      if (metodepengeluaran != "proyek") {
        let sql = `update ${table} set sn=?, harga=?, metodepengeluaran=?, tanggal=? where id=?`;
        let values = [sn, harga, metodepengeluaran, tanggal, id];
        const res = await conn.execute(sql, values);
      } else {
        console.log("start");
        const isSelected = true;
        let res = await queryDelete({
          ...rest,
          id,
          id_produkmasuk,
          id_produk,
          metodepengeluaran,
          jumlah: oldJumlah,
          conn,
        });
        res = await queryCreate({
          ...rest,
          id_produk,
          sn,
          metodepengeluaran,
          harga,
          tanggal,
          isSelected,
          conn,
        });
      }
    });
    return result;
  } catch (err) {
    console.error("Error : ", err);
    throw err;
  }
};
// const update2 = async () => {};
const destroy = async (rest) => {
  try {
    const result = await withTransaction(pool, async (conn) => {
      const res = await queryDelete({ ...rest, conn });
      return res;
    });
    return result;
  } catch (err) {
    console.error("Error : ", err);
    throw err;
  }
};

/**
 * @returns {Promise<{
 *   kategoriInsertId: number | null;
 *   merekInsertId: number | null;
 *   vendorInsertId: number | null;
 *   produkInsertId: number;
 *   produkMasukInsertId?: number;
 * }>}
 */
const queryCreate = async ({
  id_produk,
  sn,
  metodepengeluaran,
  serialnumbers,
  jumlah = 0,
  harga = 0,
  tanggal,
  keterangan = "",
  isSelected,
  idproyek,
  id_proyek,
  karyawan,
  id_karyawan = null,
  idproduk,
  status,
  conn,
}) => {
  assertTransaction(conn, queryCreate.name);
  try {
    if (!sn || sn == 0)
      if (!jumlah || jumlah == 0) throw new Error("Jumlah tidak boleh 0!");
    // Start the transaction

    let sql, values, result;
    sql = "select stok, satuan from produk where id=? for update";
    values = [id_produk];
    [result] = await conn.execute(sql, values);
    console.log(1);
    const produk = result[0];
    const stok = produk.stok;
    const satuan = produk.satuan;
    if (jumlah > stok)
      throw new Error(`Stok tidak mencukupi. Maks. ${stok} ${satuan}.`);
    if (sn == 1) {
      for (let i = 0; i < serialnumbers.length; i++) {
        let sql = `select id from produkmasuk where jumlah > keluar and id_produk = ? order by harga desc limit 1`;
        let values = [id_produk];
        let [value] = await conn.execute(sql, values);
        console.log(2);
        const produkmasuk = value[0];
        sql = `update produkmasuk set keluar = keluar + 1 where id = ?`;
        values = [produkmasuk.id];
        [result] = await conn.execute(sql, values);
        console.log(3);
        sql = `update produk set stok = stok - 1 where id = ?`;
        values = [id_produk];
        [result] = await conn.execute(sql, values);
        console.log(4);
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
        console.log(values)[result] = await conn.execute(sql, values);
        console.log(5);
      }
    } else {
      let sisa = jumlah;
      while (sisa > 0) {
        sql = `select id, (jumlah - keluar) stok, harga, id_vendor from produkmasuk where jumlah > keluar and id_produk = ?  order by harga desc limit 1 for update`;
        values = [id_produk];
        [result] = await conn.execute(sql, values);
        console.log(6);
        const produkmasuk = result[0];
        const stok = produkmasuk.stok;
        const keluar = sisa >= stok ? stok : sisa;
        sisa -= keluar;
        const idProdukMasuk = produkmasuk.id;

        sql = `update produkmasuk set keluar = keluar + ? where id = ?`;
        values = [keluar, idProdukMasuk];
        [result] = await conn.execute(sql, values);
        console.log(7);

        sql = `update produk set stok = stok - ? where id = ?`;
        values = [keluar, id_produk];
        [result] = await conn.execute(sql, values);
        console.log(8);

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
        [result] = await conn.execute(sql, values);
        console.log(9);

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
          [result] = await conn.execute(sql, values);
          console.log(10);
        }
      }
    }
  } catch (err) {
    console.error("Error : ", err);
    throw err;
  }
};
const queryDelete = async ({
  id,
  jumlah,
  id_produkmasuk,
  id_produk,
  metodepengeluaran,
  conn,
}) => {
  assertTransaction(conn, queryDelete.name);
  try {
    let [sql, values] = ["", ""];
    sql = `select * from ${table} where id = ? for update`;
    values = [id];
    const [test] = await conn.execute(sql, values);
    console.log(1);
    await conn.execute(`select produkmasuk where id = ? for update`, [
      id_produkmasuk,
    ]);
    await conn.execute(`select produk where id = ? for update`, [id_produk]);

    if (test.length == 0) throw new Error("Produk masuk telah terhapus.");

    sql = `delete from ${table} where id = ?`;
    values = [id];
    const [result1] = await conn.execute(sql, values);
    console.log(2);

    if (metodepengeluaran == "proyek") {
      sql = `delete from pengeluaranproyek where id_produkkeluar = ?`;
      values = [id];
      const [result4] = await conn.execute(sql, values);
      console.log(3);
    }

    sql = `update produkmasuk set keluar=keluar - ? where id = ?`;
    values = [jumlah, id_produkmasuk];
    const [result2] = await conn.execute(sql, values);
    console.log(4);

    sql = `update produk set stok=stok + ? where id = ?`;
    values = [jumlah, id_produk];
    const [result3] = await conn.execute(sql, values);
    console.log(5);
  } catch (err) {
    console.error("Error : ", err);
    throw err;
  }
};

module.exports = { list, create, update, destroy };
