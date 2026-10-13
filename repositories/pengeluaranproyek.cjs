const connection = require("./db.cjs");
const table = "pengeluaranproyek";

const query = (sql, values) =>
  new Promise((resolve, reject) => {
    connection.query(sql, values, (error, rows) => {
      if (error) return reject(error);
      resolve(rows || []);
    });
  });

const isDebtAccount = (line) =>
  line.coa_type === "Kewajiban Lancar" || line.coa_subtype === "Hutang";

const addAccountBalance = (balances, line, amount) => {
  const key = String(line.id_coa);
  const balance = balances.get(key) || { name: line.coa, amount: 0 };
  balance.amount += amount;
  balances.set(key, balance);
};

const addSourceFund = (summary, line, amount) => {
  const key = String(line.id_produkmasuk);
  const entry = summary.get(key) || {
    funds: new Map(),
    debts: new Map(),
  };
  addAccountBalance(entry.funds, line, amount);
  summary.set(key, entry);
};

const addDebtBalance = (summary, line, amount) => {
  const key = String(line.id_produkmasuk);
  const entry = summary.get(key) || {
    funds: new Map(),
    debts: new Map(),
  };
  addAccountBalance(entry.debts, line, amount);
  summary.set(key, entry);
};

const mapSourceFunds = (rows, journalLines) => {
  const summaries = new Map();

  for (const line of journalLines) {
    const entryId = Number(line.id_produkmasuk);
    const purchaseDescription = `Pembelian stok masuk #${entryId}`;
    const correctionDescription = `Koreksi pembelian stok masuk #${entryId}`;
    const paymentDescription = `Pembayaran stok masuk #${entryId}`;
    const isPurchase = line.journal_keterangan === purchaseDescription;
    const isCorrection = line.journal_keterangan === correctionDescription;
    const isPayment = line.journal_keterangan === paymentDescription;
    const type = Number(line.tipe);
    const amount = Number(line.amount || 0);
    const isDebt = isDebtAccount(line);

    if (isDebt && (isPurchase || isCorrection || isPayment)) {
      addDebtBalance(summaries, line, type === 0 ? amount : -amount);
    }

    if (isDebt) continue;

    if (
      isPurchase &&
      type === 0 &&
      ["Pembayaran pembelian", "Pembayaran awal pembelian"].includes(
        line.transaksi_keterangan,
      )
    ) {
      addSourceFund(summaries, line, amount);
    } else if (isCorrection) {
      if (
        type === 0 &&
        [
          "Akun lawan pembelian setelah koreksi",
          "Pembayaran awal pembelian",
        ].includes(line.transaksi_keterangan)
      ) {
        addSourceFund(summaries, line, amount);
      } else if (type === 1) {
        const transactionLabel = line.transaksi_keterangan || "";
        const originalLabel = transactionLabel.replace(/^(?:Pembalikan:\s*)+/);
        const isReversedSource =
          transactionLabel !== originalLabel &&
          ["Pembayaran pembelian", "Pembayaran awal pembelian"].includes(
            originalLabel,
          );
        if (
          isReversedSource ||
          transactionLabel === "Pembatalan akun lawan pembelian sebelumnya"
        ) {
          addSourceFund(summaries, line, -amount);
        }
      }
    } else if (
      isPayment &&
      type === 0 &&
      line.transaksi_keterangan === "Pembayaran stok masuk"
    ) {
      addSourceFund(summaries, line, amount);
    }
  }

  return rows.map((row) => {
    if (!row.id_produkmasuk) return row;

    const entryId = String(row.id_produkmasuk);
    const summary = summaries.get(entryId);
    const parts = [...(summary?.funds || new Map()).values()]
      .filter((account) => account.amount > 0.001)
      .map((account) => account.name);
    const total =
      Number(row.produkmasuk_jumlah || 0) * Number(row.produkmasuk_harga || 0);
    const outstanding = Math.max(
      0,
      total - Number(row.produkmasuk_terbayar || 0),
    );

    if (outstanding > 0.001 && Number(row.produkmasuk_pinjaman) !== 1) {
      const debtAccount = [...(summary?.debts || new Map()).values()]
        .filter((account) => account.amount > 0.001)
        .sort((first, second) => second.amount - first.amount)[0];
      parts.push(debtAccount?.name || "Hutang");
    }

    return {
      ...row,
      sumber_dana: parts.join(", ") || "Tidak tercatat",
    };
  });
};

const list = async ({
  id_proyek,
  monthyear,
  start,
  end,
  id_vendor,
  id_kategori,
}) => {
  const sql = `Select 
    kp.nama               kategori, 
    i.nama                instansi,
    v.nama                vendor, 
    pk.id_produkmasuk,
    pm.harga              hargaprodukmasuk,
    pm.jumlah             produkmasuk_jumlah,
    pm.terbayar           produkmasuk_terbayar,
    pm.pinjaman           produkmasuk_pinjaman,
    pp.id_produkkeluar,
    pr.id id_proyek,
    pr.id_second,
    pr.nama namaproyek,
    pr.id_instansi,
    pp.id                 id_pengeluaranproyek,
    pp.tanggal            tanggalpengeluaran,
    pp.jumlah,
    pp.harga              hargapengeluaran,
    pp.status,
    pp.lunas,
    pp.keterangan         keteranganpp,
    k.id id_karyawan,
    k.nama namakaryawan,
    p.*,
    m.nama merek,
    coalesce(pm.harga, pp.harga, 0) as hargareal
  From ${table} pp 
    left join produk p            on pp.id_produk = p.id 
    left join karyawan k          on pp.id_karyawan = k.id 
    left join proyek pr           on pp.id_proyek=pr.id 
    left join merek m             on m.id=p.id_merek 
    left join vendor v            on v.id=pp.id_vendor 
    left join produkkeluar pk     on pk.id=pp.id_produkkeluar 
    left join produkmasuk pm      on pm.id=pk.id_produkmasuk 
    left join instansi i          on pr.id_instansi=i.id 
    left join kategoriproduk kp   on p.id_kategori = kp.id  
  where 1=1 ${id_proyek ? `and pr.id=?` : ""} ${
    monthyear ? `and DATE_FORMAT(pp.tanggal, '%m-%Y') =?` : ""
  } ${start ? `and pp.tanggal>=?` : ""} ${end ? `and pp.tanggal<=?` : ""} ${
    id_vendor ? `and pp.id_vendor=?` : ""
  } ${id_kategori ? "and id_kategori=?" : ""} order by pp.tanggal desc`;
  const values = [];
  if (id_proyek) values.push(id_proyek);
  if (monthyear) values.push(monthyear);
  if (start) values.push(start);
  if (end) values.push(end);
  if (id_vendor) values.push(id_vendor);
  if (id_kategori) values.push(id_kategori);
  let rows;
  try {
    rows = await query(sql, values);
  } catch (error) {
    console.log(error);
    return [];
  }
  const entryIds = [
    ...new Set(
      rows
        .map((row) => Number(row.id_produkmasuk))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (!entryIds.length) return rows;

  const placeholders = entryIds.map(() => "?").join(", ");
  let journalLines;
  try {
    journalLines = await query(
      `SELECT pmp.id_produkmasuk, j.keterangan AS journal_keterangan,
              t.id_coa, t.tipe, t.amount,
              t.keterangan AS transaksi_keterangan,
              c.nama AS coa, cs.nama AS coa_subtype, ct.nama AS coa_type
       FROM produkmasuk_pembayaran pmp
       INNER JOIN jurnal j ON j.id = pmp.id_jurnal
       INNER JOIN transaksi t ON t.id_jurnal = j.id
       INNER JOIN coa c ON c.id = t.id_coa
       LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
       LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
       WHERE pmp.aktif = 1
         AND pmp.id_produkmasuk IN (${placeholders})
       ORDER BY pmp.id ASC, t.id ASC`,
      entryIds,
    );
  } catch (error) {
    console.log(error);
    return mapSourceFunds(rows, []);
  }

  return mapSourceFunds(rows, journalLines);
};

const create = ({
  id_proyek,
  idproyek,
  tanggal,
  id_karyawan,
  karyawan,
  id_vendor,
  id_produk,
  idproduk,
  jumlah,
  harga,
  status,
  keterangan = "",
}) => {
  if (idproduk) console.log("id_produk : " + idproduk);
  const sql = `insert into ${table} (id_proyek, tanggal, id_karyawan, id_produk, id_vendor, jumlah, harga, status, keterangan) values (${
    idproyek ? `(select id from proyek where id_second=?)` : `?`
  }, ?, ${karyawan ? `(select id from karyawan where nama=?)` : `?`}, ${
    idproduk ? `(select id from produk where id_kustom=?)` : `?`
  }, ?, ?, ?, ?, ?)`;
  const values = [
    idproyek ?? id_proyek,
    tanggal,
    karyawan ?? id_karyawan,
    idproduk ?? id_produk ?? "",
    id_vendor,
    jumlah,
    harga ?? 0,
    status ?? 0,
    keterangan ?? "",
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      console.log(err);
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, tanggal, jumlah, harga, status, keterangan }) => {
  const sql = `update ${table} set tanggal = ?, jumlah = ?, harga = ?, status = ?, keterangan = ? where id=?`;
  const values = [tanggal, jumlah, harga, status ?? 0, keterangan, id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, destroy };
