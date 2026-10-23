const { withTransaction } = require("../helpers/transaction.cjs");
const { create: createVendor } = require("./vendor.cjs");
const { update: updateProduk } = require("./produk.cjs");
const { pool } = require("./db.2.0.0.cjs");
const {
  invalidateProductApprovals,
} = require("../src/modules/project-approval/project-approval-invalidation.cjs");
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
  ${laporan ? "and (pm.jumlah-pm.keluar) > 0" : ""}
  order by ${laporan ? `kp.nama, p.nama,` : ""} pm.tanggal desc, p.id, pm.id`;
  const values = [];
  if (id_produk) values.push(id_produk);
  if (id_perusahaan) values.push(id_perusahaan);
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const getLinkedJournals = async (conn, id_produkmasuk) => {
  const [rows] = await conn.execute(
    `SELECT pmp.id AS id_link, pmp.id_jurnal, j.id_jurnal_form, j.tanggal,
            j.keterangan,
            DATE_FORMAT(j.tanggal, '%Y-%m') AS journal_month,
            DATE_FORMAT(CURRENT_DATE(), '%Y-%m') AS current_month
     FROM produkmasuk_pembayaran pmp
     INNER JOIN jurnal j ON j.id = pmp.id_jurnal
    WHERE pmp.id_produkmasuk = ?
     ORDER BY pmp.id ASC
     FOR UPDATE`,
    [id_produkmasuk],
  );
  return rows;
};

const getJournalLines = async (conn, journalIds) => {
  if (!journalIds.length) return [];
  const placeholders = journalIds.map(() => "?").join(", ");
  const [rows] = await conn.execute(
    `SELECT id, id_jurnal, id_coa, tipe, amount, keterangan
     FROM transaksi
     WHERE id_jurnal IN (${placeholders})
     ORDER BY id ASC
     FOR UPDATE`,
    journalIds,
  );
  return rows;
};

const createCorrectionJournal = async (
  conn,
  {
    id_jurnal_form = null,
    id_perusahaan,
    id_produkmasuk,
    keterangan,
    lines,
    updated_by = null,
  },
) => {
  if (!lines.length) return null;
  const [journalResult] = await conn.execute(
    `INSERT INTO jurnal
      (id_jurnal_form, id_perusahaan, tanggal, keterangan, created_by, updated_by)
     VALUES (?, ?, CURRENT_DATE(), ?, ?, ?)`,
    [id_jurnal_form, id_perusahaan, keterangan, updated_by, updated_by],
  );
  const journalId = journalResult.insertId;
  const values = [];
  const placeholders = lines
    .map((line) => {
      values.push(
        journalId,
        line.id_coa,
        line.tipe,
        Number(line.amount),
        line.keterangan || keterangan,
        updated_by,
        updated_by,
      );
      return "(?, ?, ?, ?, ?, ?, ?)";
    })
    .join(", ");
  await conn.execute(
    `INSERT INTO transaksi
      (id_jurnal, id_coa, tipe, amount, keterangan, created_by, updated_by)
     VALUES ${placeholders}`,
    values,
  );
  await conn.execute(
    `INSERT INTO produkmasuk_pembayaran
      (id_produkmasuk, id_jurnal, created_by, updated_by)
     VALUES (?, ?, ?, ?)`,
    [id_produkmasuk, journalId, updated_by, updated_by],
  );
  return journalId;
};

const getPurchaseJournal = (journals, id_produkmasuk) =>
  journals.find(
    (journal) =>
      journal.keterangan === `Pembelian stok masuk #${id_produkmasuk}`,
  );

const makePurchaseCorrectionLines = (purchaseLines, oldAmount, newAmount) => {
  const debit = purchaseLines.find((line) => Number(line.tipe) === 1);
  const credit = purchaseLines.find((line) => Number(line.tipe) === 0);
  if (!debit || !credit || purchaseLines.length !== 2)
    throw new Error("Jurnal pembelian tidak valid dan tidak dapat dikoreksi.");

  return [
    {
      id_coa: debit.id_coa,
      tipe: 0,
      amount: oldAmount,
      keterangan: "Pembatalan nilai persediaan sebelumnya",
    },
    {
      id_coa: credit.id_coa,
      tipe: 1,
      amount: oldAmount,
      keterangan: "Pembatalan akun lawan pembelian sebelumnya",
    },
    {
      id_coa: debit.id_coa,
      tipe: 1,
      amount: newAmount,
      keterangan: "Nilai persediaan setelah koreksi",
    },
    {
      id_coa: credit.id_coa,
      tipe: 0,
      amount: newAmount,
      keterangan: "Akun lawan pembelian setelah koreksi",
    },
  ].filter((line) => Number(line.amount) > 0);
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
  jumlah,
  harga,
  hargajual,
  isUpdateHarga,
  id_vendor,
  tanggal,
  tanggalHarga,
  jatuhtempo,
  jatuhTempo,
  vendor,
  alamatVendor,
  id_vendor_jenis,
  updated_by = null,
}) => {
  const idProdukMasuk = Number(id);
  if (!Number.isInteger(idProdukMasuk) || idProdukMasuk <= 0)
    throw new Error("ID produk masuk tidak valid.");
  try {
    const result = await withTransaction(pool, async (conn) => {
      const [oldRows] = await conn.execute(
        "select * from produkmasuk where id=? for update",
        [idProdukMasuk],
      );
      const oldEntry = oldRows[0];
      if (!oldEntry) throw new Error("Produk masuk tidak ditemukan.");
      if (
        oldEntry.id_produkpinjaman ||
        oldEntry.jenis_transaksi === "pengembalian"
      )
        throw new Error(
          "Stok pinjaman/pengembalian tidak dapat diubah langsung.",
        );
      const nextJumlah = Number(jumlah ?? oldEntry.jumlah);
      const nextHarga = Number(harga ?? oldEntry.harga);
      if (!Number.isFinite(nextJumlah) || nextJumlah <= 0)
        throw new Error("Jumlah harus lebih besar dari 0.");
      if (!Number.isFinite(nextHarga) || nextHarga < 0)
        throw new Error("Harga tidak valid.");
      if (nextJumlah < Number(oldEntry.keluar))
        throw new Error(
          "Jumlah tidak boleh kurang dari stok yang sudah keluar.",
        );
      const nextDate = tanggal ?? oldEntry.tanggal;
      if (
        typeof nextDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(nextDate) ||
        Number.isNaN(Date.parse(`${nextDate}T00:00:00Z`)) ||
        new Date(`${nextDate}T00:00:00Z`).toISOString().slice(0, 10) !==
          nextDate
      )
        throw new Error("Tanggal produk masuk tidak valid.");

      let nextVendorId = id_vendor || oldEntry.id_vendor;
      if (vendor && !id_vendor) {
        const [vendorRows] = await conn.execute(
          "SELECT id FROM vendor WHERE nama = ? LIMIT 1",
          [vendor.trim()],
        );
        nextVendorId = vendorRows[0]?.id;
        if (!nextVendorId) {
          nextVendorId = await createVendor({
            nama: vendor.trim(),
            alamat: alamatVendor || "",
            id_vendor_jenis: id_vendor_jenis || null,
            conn,
          });
        }
      }
      if (!nextVendorId) throw new Error("Vendor belum dipilih.");

      const productId = oldEntry.id_produk;
      const companyId = oldEntry.id_perusahaan;
      const oldTotal = Number(oldEntry.jumlah) * Number(oldEntry.harga);
      const nextTotal = nextJumlah * nextHarga;
      const journals = await getLinkedJournals(conn, idProdukMasuk);
      const purchaseJournal = getPurchaseJournal(journals, idProdukMasuk);
      const journalLines = purchaseJournal
        ? await getJournalLines(conn, [purchaseJournal.id_jurnal])
        : [];
      const purchaseDebit = journalLines.find(
        (line) => Number(line.tipe) === 1,
      );
      const purchaseCredit = journalLines.find(
        (line) => Number(line.tipe) === 0,
      );
      if (purchaseJournal && (!purchaseDebit || !purchaseCredit))
        throw new Error("Jurnal pembelian tidak valid.");
      if (journals.length && !purchaseJournal)
        throw new Error("Jurnal pembelian awal tidak ditemukan.");

      let nextTerbayar = Number(oldEntry.terbayar || 0);
      if (purchaseCredit) {
        const [[creditRows]] = await Promise.all([
          conn.execute(
            `SELECT cs.nama AS coa_subtype, ct.nama AS coa_type
             FROM coa c
             LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
             LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
             WHERE c.id = ?
             LIMIT 1`,
            [purchaseCredit.id_coa],
          ),
        ]);
        const isDebtAccount =
          creditRows[0]?.coa_type === "Kewajiban Lancar" ||
          creditRows[0]?.coa_subtype === "Hutang";
        if (!isDebtAccount && nextTerbayar >= oldTotal - 0.01)
          nextTerbayar = nextTotal;
      }
      if (nextTotal + 0.001 < nextTerbayar)
        throw new Error(
          "Jumlah dan harga baru tidak boleh kurang dari total yang sudah dibayar.",
        );

      let correctionJournalId = null;
      if (purchaseJournal && !oldEntry.pinjaman) {
        const sameMonthEdit =
          purchaseJournal.journal_month === purchaseJournal.current_month &&
          nextDate.slice(0, 7) === purchaseJournal.current_month;
        if (sameMonthEdit) {
          if (journalLines.length !== 2)
            throw new Error("Jurnal pembelian tidak valid untuk diedit.");
          await conn.execute(
            `UPDATE jurnal
             SET tanggal = ?, updated_by = COALESCE(?, updated_by)
             WHERE id = ? AND id_perusahaan = ?`,
            [nextDate, updated_by, purchaseJournal.id_jurnal, companyId],
          );
          await conn.execute(
            `UPDATE transaksi
             SET amount = ?, updated_by = COALESCE(?, updated_by)
             WHERE id = ? AND id_jurnal = ?`,
            [
              nextTotal,
              updated_by,
              purchaseDebit.id,
              purchaseJournal.id_jurnal,
            ],
          );
          await conn.execute(
            `UPDATE transaksi
             SET amount = ?, updated_by = COALESCE(?, updated_by)
             WHERE id = ? AND id_jurnal = ?`,
            [
              nextTotal,
              updated_by,
              purchaseCredit.id,
              purchaseJournal.id_jurnal,
            ],
          );
        } else {
          const correctionLines = makePurchaseCorrectionLines(
            journalLines,
            oldTotal,
            nextTotal,
          );
          correctionJournalId = await createCorrectionJournal(conn, {
            id_jurnal_form: purchaseJournal.id_jurnal_form,
            id_perusahaan: companyId,
            id_produkmasuk: idProdukMasuk,
            keterangan: `Koreksi pembelian stok masuk #${idProdukMasuk}`,
            lines: correctionLines,
            updated_by,
          });
        }
      }

      const nextDueDate =
        jatuhTempo !== undefined
          ? jatuhTempo
          : jatuhtempo !== undefined
            ? jatuhtempo
            : oldEntry.jatuhtempo;
      await conn.execute(
        `UPDATE ${table}
         SET jumlah = ?, harga = ?, id_vendor = ?, tanggal = ?,
             terbayar = ?, jatuhtempo = ?
         WHERE id = ?`,
        [
          nextJumlah,
          nextHarga,
          nextVendorId,
          nextDate,
          nextTerbayar,
          nextDueDate || null,
          idProdukMasuk,
        ],
      );
      const stockDelta = nextJumlah - Number(oldEntry.jumlah);
      if (stockDelta !== 0) {
        await adjustCompanyStock({
          conn,
          id_produk: productId,
          id_perusahaan: companyId,
          jumlah: stockDelta,
          updated_by,
        });
      }
      await updateProduk({
        conn,
        id: productId,
        stokDelta: stockDelta,
        ...(isUpdateHarga
          ? { hargamodal: nextHarga, hargajual, tanggal: tanggalHarga }
          : {}),
      });
      await invalidateProductApprovals(conn, productId, updated_by);
      return {
        message: "Sukses",
        id_jurnal_koreksi: correctionJournalId,
      };
    });
    return result;
  } catch (err) {
    console.error("Error: ", err.message);
    throw err;
  }
};
const destroy = async ({ id, updated_by = null }) => {
  const idProdukMasuk = Number(id);
  if (!Number.isInteger(idProdukMasuk) || idProdukMasuk <= 0)
    throw new Error("ID produk masuk tidak valid.");
  try {
    const result = await withTransaction(pool, async (conn) => {
      const [test] = await conn.execute(
        "select * from produkmasuk where id = ? for update",
        [idProdukMasuk],
      );
      const entry = test[0];
      if (!entry) throw new Error("Produk masuk telah terhapus.");
      await conn.execute("select stok from produk where id=? for update", [
        entry.id_produk,
      ]);
      if (entry.id_produkpinjaman || entry.jenis_transaksi === "pengembalian")
        throw new Error(
          "Stok pinjaman/pengembalian tidak dapat dihapus langsung.",
        );
      if (Number(entry.keluar) > 0)
        throw new Error("Produk masuk dengan stok keluar tidak dapat dihapus.");

      const journals = await getLinkedJournals(conn, idProdukMasuk);
      const journalIds = journals.map((journal) => journal.id_jurnal);
      const journalLines = await getJournalLines(conn, journalIds);
      let correctionJournalId = null;
      if (journals.length) {
        const canDeleteJournals = journals.every(
          (journal) => journal.journal_month === journal.current_month,
        );
        if (canDeleteJournals) {
          await conn.execute(
            "DELETE FROM produkmasuk_pembayaran WHERE id_produkmasuk = ?",
            [idProdukMasuk],
          );
          const placeholders = journalIds.map(() => "?").join(", ");
          await conn.execute(
            `DELETE FROM transaksi WHERE id_jurnal IN (${placeholders})`,
            journalIds,
          );
          await conn.execute(
            `DELETE FROM jurnal WHERE id IN (${placeholders})`,
            journalIds,
          );
        } else {
          if (!journalLines.length)
            throw new Error(
              "Jurnal produk masuk tidak memiliki transaksi untuk dikoreksi.",
            );
          const purchaseJournal = getPurchaseJournal(journals, idProdukMasuk);
          const correctionLines = journalLines.map((line) => ({
            id_coa: line.id_coa,
            tipe: Number(line.tipe) === 1 ? 0 : 1,
            amount: Number(line.amount),
            keterangan: `Pembalikan: ${line.keterangan || "Transaksi produk masuk"}`,
          }));
          correctionJournalId = await createCorrectionJournal(conn, {
            id_jurnal_form: purchaseJournal?.id_jurnal_form ?? null,
            id_perusahaan: entry.id_perusahaan,
            id_produkmasuk: idProdukMasuk,
            keterangan: `Koreksi penghapusan stok masuk #${idProdukMasuk}`,
            lines: correctionLines,
            updated_by,
          });
          await conn.execute(
            "DELETE FROM produkmasuk_pembayaran WHERE id_produkmasuk = ?",
            [idProdukMasuk],
          );
        }
      }
      await conn.execute(`delete from ${table} where id = ?`, [idProdukMasuk]);
      await adjustCompanyStock({
        conn,
        id_produk: entry.id_produk,
        id_perusahaan: entry.id_perusahaan,
        jumlah: -Number(entry.jumlah),
        updated_by,
      });
      await updateProduk({
        conn,
        id: entry.id_produk,
        stokDelta: -Number(entry.jumlah),
      });
      return { message: "Sukses", id_jurnal_koreksi: correctionJournalId };
    });
    return result;
  } catch (err) {
    console.error("Error : ", err.message);
    throw err;
  }
};

module.exports = { list, create, update, destroy, createCorrectionJournal };
