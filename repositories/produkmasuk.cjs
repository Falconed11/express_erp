const { withTransaction } = require("../helpers/transaction.cjs");
const { create: createVendor } = require("./vendor.cjs");
const { update: updateProduk } = require("./produk.cjs");
const { pool } = require("./db.2.0.0.cjs");
const { createPurchaseJournal } = require("./produkmasuk-jurnal.cjs");
const {
  adjust: adjustCompanyStock,
} = require("../src/modules/produk-stock/produk-stock.repository.cjs");

const table = "produkmasuk";

const list = async ({ id_produk, laporan, pinjaman, id_perusahaan }) => {
  const sql = `
  select  pm.*, 
          (pm.jumlah*pm.harga-pm.terbayar) hutang, 
          (pm.jumlah-pm.keluar) sisa, 
          (pm.jumlah-pm.keluar)*pm.harga sisamodal, 
          p.id_kustom, 
          p.nama, 
          p.tipe, 
          p.satuan, 
          p.hargamodal, 
          p.stok, 
          p.tanggal tanggalharga, 
          m.nama merek, 
          v.nama vendor, 
          kp.nama kategoriproduk,
          pmc.nama nama_perusahaan,
          pembayaran.id_jurnal
  from ${table} pm 
  left join produk p            on p.id=pm.id_produk 
  left join merek m             on m.id=p.id_merek 
  left join vendor v            on v.id=pm.id_vendor 
  left join kategoriproduk kp   on kp.id=p.id_kategori
  left join perusahaan pmc      on pmc.id=pm.id_perusahaan
  left join (
    select id_produkmasuk, max(id_jurnal) id_jurnal
    from produkmasuk_pembayaran
    where aktif = 1
    group by id_produkmasuk
  ) pembayaran on pembayaran.id_produkmasuk = pm.id
  where pm.id_perusahaan is not null ${
    id_produk ? `and id_produk = ?` : ""
  } ${id_perusahaan ? "and pm.id_perusahaan = ?" : ""}
  ${pinjaman ? "and pm.pinjaman = 1" : ""}
  ${laporan ? "and (pm.jumlah-pm.keluar) > 0" : ""} order by ${
    laporan ? `kp.nama, p.nama,` : ""
  } pm.tanggal desc, p.id`;
  const values = [];
  if (id_produk) values.push(id_produk);
  if (id_perusahaan) values.push(id_perusahaan);
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const assertNoLinkedJournal = async (conn, id_produkmasuk) => {
  const [rows] = await conn.execute(
    "SELECT id FROM produkmasuk_pembayaran WHERE id_produkmasuk = ? LIMIT 1 FOR UPDATE",
    [id_produkmasuk],
  );
  if (rows.length > 0) {
    throw new Error(
      "Stok masuk yang memiliki jurnal tidak dapat diubah atau dihapus.",
    );
  }
};

const create = async ({
  lunas,
  id_produk,
  id_vendor,
  jumlah,
  harga,
  hargajual,
  id_coa_kredit,
  tanggal,
  tanggalHarga,
  jatuhtempo,
  jatuhTempo,
  isUpdateHarga,
  pinjaman,
  id_perusahaan,
  created_by = null,
  updated_by = null,
  ...rest
}) => {
  const isPinjaman = pinjaman === true || pinjaman === 1 || pinjaman === "1";
  jumlah = jumlah ?? 0;
  if (jumlah <= 0) throw new Error("Jumlah tidak boleh 0!");
  if (!id_perusahaan) throw new Error("Perusahaan belum dipilih.");
  if (!id_vendor && !rest.vendor) throw new Error("Vendor belum dipilih!");
  harga = harga ?? 0;
  jatuhtempo = jatuhtempo ?? jatuhTempo ?? null;
  const isLunas =
    lunas == null || lunas === true || lunas === 1 || lunas === "1";
  const isHutang = lunas === false || lunas === 0 || lunas === "0";
  if (!isPinjaman && !isLunas && !isHutang) {
    throw new Error("Status pembayaran harus Lunas atau Hutang.");
  }
  const total = Number(jumlah) * Number(harga);
  if (!isPinjaman && (!Number.isFinite(total) || total <= 0)) {
    throw new Error("Total pembelian harus lebih besar dari 0.");
  }
  try {
    const result = await withTransaction(pool, async (conn) => {
      await conn.execute("select stok from produk where id =? for update", [
        id_produk,
      ]);
      if (rest.vendor && !id_vendor)
        id_vendor = await createVendor({
          nama: rest.vendor,
          alamat: rest.alamatVendor || "",
          id_vendor_jenis: rest.id_vendor_jenis || null,
          conn,
        });
      let sql = `insert into ${table} (id_produk, id_vendor, jumlah, harga, terbayar, tanggal, jatuhtempo, pinjaman, id_perusahaan) values (?,?,?,?,?,?,?,?,?)`;
      let values = [
        id_produk,
        id_vendor,
        jumlah,
        harga,
        isPinjaman ? 0 : isLunas ? total : 0,
        tanggal,
        !isPinjaman && isHutang ? jatuhtempo : null,
        isPinjaman ? 1 : 0,
        id_perusahaan,
      ];
      const [result1] = await conn.execute(sql, values);

      const journalId = isPinjaman
        ? null
        : await createPurchaseJournal(conn, {
            id_produkmasuk: result1.insertId,
            id_perusahaan,
            id_coa_kredit,
            tanggal,
            amount: total,
            lunas: isLunas,
            created_by,
          });

      await adjustCompanyStock({
        conn,
        id_produk,
        id_perusahaan,
        jumlah,
        created_by,
        updated_by,
      });
      await updateProduk({
        conn,
        id: id_produk,
        stokDelta: jumlah,
        ...(isUpdateHarga
          ? { hargamodal: harga, hargajual, tanggal: tanggalHarga }
          : {}),
      });
      return {
        message: "Sukses",
        id_produkmasuk: result1.insertId,
        id_jurnal: journalId,
      };
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
  hargajual,
  isUpdateHarga,
  id_vendor,
  tanggal,
  lunas,
  tanggalHarga,
  jatuhTempo,
  pinjaman,
  id_perusahaan,
}) => {
  const isPinjaman = pinjaman === true || pinjaman === 1 || pinjaman === "1";
  oldJumlah = oldJumlah ?? 0;
  jumlah = jumlah ?? 0;
  if (jumlah == 0) throw new Error("Jumlah tidak boleh 0!");
  harga = harga ?? 0;
  try {
    const result = await withTransaction(pool, async (conn) => {
      const [oldRows] = await conn.execute(
        "select * from produkmasuk where id=? for update",
        [id],
      );
      const oldEntry = oldRows[0];
      if (!oldEntry) throw new Error("Produk masuk tidak ditemukan.");
      await assertNoLinkedJournal(conn, id);
      if (
        oldEntry.id_produkpinjaman ||
        oldEntry.jenis_transaksi === "pengembalian"
      )
        throw new Error(
          "Stok pinjaman/pengembalian tidak dapat diubah langsung.",
        );
      if (Number(jumlah) < Number(oldEntry.keluar))
        throw new Error(
          "Jumlah tidak boleh kurang dari stok yang sudah keluar.",
        );
      const companyId =
        id_perusahaan == null ? oldEntry.id_perusahaan : id_perusahaan;
      const productId = id_produk ?? oldEntry.id_produk;
      if (
        Number(oldEntry.keluar) > 0 &&
        (String(productId) !== String(oldEntry.id_produk) ||
          String(companyId) !== String(oldEntry.id_perusahaan))
      )
        throw new Error(
          "Perusahaan dan produk tidak dapat diubah setelah stok ini digunakan.",
        );
      await conn.execute("select stok from produk where id=? for update", [
        oldEntry.id_produk,
      ]);
      if (String(productId) !== String(oldEntry.id_produk))
        await conn.execute("select stok from produk where id=? for update", [
          productId,
        ]);
      let sql = `update ${table} set id_produk=?, jumlah=?, harga=?, id_vendor=?, tanggal=?, terbayar=?, jatuhtempo=?, pinjaman=?, id_perusahaan=? where id=?`;
      let values = [
        productId,
        jumlah,
        harga,
        id_vendor,
        tanggal,
        isPinjaman ? 0 : lunas == "1" ? jumlah * harga : 0,
        !isPinjaman && lunas == "0" ? jatuhTempo : null,
        isPinjaman ? 1 : 0,
        companyId,
        id,
      ];
      const [result1] = await conn.execute(sql, values);
      const stockDelta = Number(jumlah) - Number(oldEntry.jumlah);
      const sameProduct = String(productId) === String(oldEntry.id_produk);
      if (sameProduct && String(oldEntry.id_perusahaan) === String(companyId)) {
        await adjustCompanyStock({
          conn,
          id_produk: productId,
          id_perusahaan: companyId,
          jumlah: stockDelta,
          updated_by: oldEntry.updated_by ?? null,
        });
      } else {
        await adjustCompanyStock({
          conn,
          id_produk: oldEntry.id_produk,
          id_perusahaan: oldEntry.id_perusahaan,
          jumlah: -Number(oldEntry.jumlah),
          updated_by: oldEntry.updated_by ?? null,
        });
        await adjustCompanyStock({
          conn,
          id_produk: productId,
          id_perusahaan: companyId,
          jumlah,
          updated_by: oldEntry.updated_by ?? null,
        });
      }
      if (sameProduct) {
        await updateProduk({
          conn,
          id: productId,
          stokDelta: stockDelta,
          ...(isUpdateHarga
            ? { hargamodal: harga, hargajual, tanggal: tanggalHarga }
            : {}),
        });
      } else {
        await updateProduk({
          conn,
          id: oldEntry.id_produk,
          stokDelta: -Number(oldEntry.jumlah),
        });
        await updateProduk({
          conn,
          id: productId,
          stokDelta: Number(jumlah),
          ...(isUpdateHarga
            ? { hargamodal: harga, hargajual, tanggal: tanggalHarga }
            : {}),
        });
      }
      return { message: "Sukses" };
    });
    return result;
  } catch (err) {
    console.error("Error: ", err.message);
    throw err;
  }
};
const destroy = async ({ id }) => {
  try {
    const result = await withTransaction(pool, async (conn) => {
      let sql, values;
      sql = `select * from produkmasuk where id = ? for update`;
      values = [id];
      const [test] = await conn.execute(sql, values);
      const entry = test[0];
      if (!entry) throw new Error("Produk masuk telah terhapus.");
      await assertNoLinkedJournal(conn, id);
      await conn.execute("select stok from produk where id=? for update", [
        entry.id_produk,
      ]);
      if (entry.id_produkpinjaman || entry.jenis_transaksi === "pengembalian")
        throw new Error(
          "Stok pinjaman/pengembalian tidak dapat dihapus langsung.",
        );
      if (Number(entry.keluar) > 0)
        throw new Error("Produk masuk dengan stok keluar tidak dapat dihapus.");
      sql = `delete from ${table} where id = ?`;
      values = [id];
      const [result1] = await conn.execute(sql, values);
      await adjustCompanyStock({
        conn,
        id_produk: entry.id_produk,
        id_perusahaan: entry.id_perusahaan,
        jumlah: -Number(entry.jumlah),
        updated_by: entry.lastuser ?? null,
      });
      await updateProduk({
        conn,
        id: entry.id_produk,
        stokDelta: -Number(entry.jumlah),
      });
      return { message: "Sukses" };
    });
    return result;
  } catch (err) {
    console.error("Error : ", err.message);
    throw err;
  }
};

module.exports = { list, create, update, destroy };
