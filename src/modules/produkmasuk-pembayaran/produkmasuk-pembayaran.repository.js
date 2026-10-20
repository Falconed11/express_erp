import { createRequire } from "node:module";
import db from "../../config/db.js";
import { withTransaction } from "../../helpers/transaction.js";

const require = createRequire(import.meta.url);
const {
  createPurchaseJournal,
} = require("../../../repositories/produkmasuk-jurnal.cjs");
const { createCorrectionJournal } = require("../../../repositories/produkmasuk.cjs");

const invalid = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getCompanyId = (user) => {
  const companyId = Number(user?.id_perusahaan);
  if (!Number.isInteger(companyId) || companyId <= 0)
    throw invalid("Perusahaan pengguna tidak valid.", 403);
  return companyId;
};

const getEntryId = (id) => {
  const entryId = Number(id);
  if (!Number.isInteger(entryId) || entryId <= 0)
    throw invalid("ID produk masuk tidak valid.");
  return entryId;
};

const getEntry = async (conn, entryId, companyId, lock = false) => {
  const [rows] = await conn.execute(
    `SELECT pm.id, pm.id_produk, pm.id_vendor, pm.jumlah, pm.harga, pm.terbayar,
            pm.tanggal, pm.jatuhtempo, pm.pinjaman, pm.jenis_transaksi,
            pm.id_perusahaan,
            p.nama, p.id_kustom, p.tipe, p.satuan, m.nama AS merek,
            v.nama AS vendor
     FROM produkmasuk pm
     INNER JOIN produk p ON p.id = pm.id_produk
     LEFT JOIN merek m ON m.id = p.id_merek
     LEFT JOIN vendor v ON v.id = pm.id_vendor
     WHERE pm.id = ? AND pm.id_perusahaan = ?
     ${lock ? "FOR UPDATE" : ""}`,
    [entryId, companyId],
  );
  if (!rows[0]) throw invalid("Produk masuk tidak ditemukan.", 404);
  return rows[0];
};

const assertCanRepairPurchaseJournal = (user) => {
  if (!["super", "owner", "admin"].includes(user?.peran))
    throw invalid("Tidak memiliki izin mengelola jurnal pembelian.", 403);
};

const getCompatiblePurchaseJournals = async (
  conn,
  { entryId, companyId, total, journalId },
) => {
  const journalCondition = journalId ? "AND j.id = ?" : "";
  const values = [
    companyId,
    `Pembelian stok masuk #${entryId}`,
    entryId,
    ...(journalId ? [journalId] : []),
    total,
    total,
  ];
  const [rows] = await conn.execute(
    `SELECT j.id AS id_jurnal, j.tanggal, j.keterangan,
            SUM(CASE WHEN t.tipe = 1 THEN t.amount ELSE 0 END) AS debit_total,
            SUM(CASE WHEN t.tipe = 0 THEN t.amount ELSE 0 END) AS credit_total,
            SUM(CASE WHEN t.tipe = 1 AND c.nama = 'Persediaan' THEN 1 ELSE 0 END) AS inventory_debits,
            MAX(CASE WHEN t.tipe = 0 THEN c.nama END) AS credit_coa
     FROM jurnal j
     INNER JOIN transaksi t ON t.id_jurnal = j.id
     INNER JOIN coa c ON c.id = t.id_coa
     WHERE j.id_perusahaan = ?
       AND j.keterangan = ?
       AND NOT EXISTS (
         SELECT 1
         FROM produkmasuk_pembayaran linked
         WHERE linked.id_jurnal = j.id
           AND linked.id_produkmasuk <> ?
       )
       ${journalCondition}
     GROUP BY j.id, j.tanggal, j.keterangan
     HAVING COUNT(t.id) = 2
       AND SUM(CASE WHEN t.tipe = 1 THEN 1 ELSE 0 END) = 1
       AND SUM(CASE WHEN t.tipe = 0 THEN 1 ELSE 0 END) = 1
       AND ROUND(SUM(CASE WHEN t.tipe = 1 THEN t.amount ELSE 0 END), 2) = ROUND(?, 2)
       AND ROUND(SUM(CASE WHEN t.tipe = 0 THEN t.amount ELSE 0 END), 2) = ROUND(?, 2)
       AND SUM(CASE WHEN t.tipe = 1 AND c.nama = 'Persediaan' THEN 1 ELSE 0 END) = 1
     ORDER BY j.tanggal DESC, j.id DESC
     LIMIT 100`,
    values,
  );
  return rows;
};

export const getPaymentOverview = async ({ id_produkmasuk, user }) => {
  const entryId = getEntryId(id_produkmasuk);
  const companyId = getCompanyId(user);
  const entry = await getEntry(db, entryId, companyId);
  const [payments] = await db.execute(
    `SELECT pmp.id, pmp.id_jurnal, j.tanggal, j.keterangan,
            COALESCE(SUM(CASE WHEN t.tipe = 1 THEN t.amount ELSE 0 END), 0) AS debit,
            COALESCE(SUM(CASE WHEN t.tipe = 0 THEN t.amount ELSE 0 END), 0) AS kredit,
          MAX(CASE WHEN t.tipe = 1 THEN t.id_coa END) AS debit_coa_id,
          MAX(CASE WHEN t.tipe = 0 THEN t.id_coa END) AS kredit_coa_id,
            GROUP_CONCAT(DISTINCT CASE WHEN t.tipe = 1 THEN c.nama END) AS debit_coa,
          GROUP_CONCAT(DISTINCT CASE WHEN t.tipe = 0 THEN c.nama END) AS kredit_coa,
          DATE_FORMAT(j.tanggal, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m') AS can_modify
     FROM produkmasuk_pembayaran pmp
     INNER JOIN jurnal j ON j.id = pmp.id_jurnal
     LEFT JOIN transaksi t ON t.id_jurnal = j.id
     LEFT JOIN coa c ON c.id = t.id_coa
     WHERE pmp.id_produkmasuk = ? AND pmp.aktif = 1
     GROUP BY pmp.id, j.id
     ORDER BY pmp.id ASC`,
    [entryId],
  );
  const [purchaseLines] = await db.execute(
    `SELECT pmp.id AS id_link, pmp.id_jurnal, j.id_jurnal_form,
            j.keterangan, j.tanggal, t.id AS id_transaksi, t.id_coa,
            t.tipe, t.amount, c.nama AS coa, cs.nama AS coa_subtype,
            ct.nama AS coa_type
     FROM produkmasuk_pembayaran pmp
     INNER JOIN jurnal j ON j.id = pmp.id_jurnal
     INNER JOIN transaksi t ON t.id_jurnal = j.id
     INNER JOIN coa c ON c.id = t.id_coa
     LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
     LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
     WHERE pmp.id_produkmasuk = ? AND pmp.aktif = 1
       AND (
         j.keterangan = ?
         OR j.keterangan = ?
       )
     ORDER BY pmp.id ASC, t.id ASC`,
    [
      entryId,
      `Pembelian stok masuk #${entryId}`,
      `Koreksi pembelian stok masuk #${entryId}`,
    ],
  );

  const accountBalances = new Map();
  let initialPaymentLinkId = null;
  let initialPaymentIsEditable = false;
  let initialDebtAccountId = null;
  let initialDebtAccountName = "";
  for (const line of purchaseLines) {
    const isDebtAccount =
      line.coa_type === "Kewajiban Lancar" || line.coa_subtype === "Hutang";
    if (line.keterangan === `Pembelian stok masuk #${entryId}`) {
      initialPaymentLinkId = line.id_link;
      initialPaymentIsEditable = true;
    }
    if (!isDebtAccount) continue;
    const balance = accountBalances.get(line.id_coa) || {
      amount: 0,
      name: line.coa,
    };
    balance.amount +=
      Number(line.tipe) === 0 ? Number(line.amount) : -Number(line.amount);
    accountBalances.set(line.id_coa, balance);
  }
  const debtAccount = [...accountBalances.entries()]
    .filter(([, balance]) => balance.amount > 0.001)
    .sort((left, right) => right[1].amount - left[1].amount)[0];
  if (debtAccount) {
    initialDebtAccountId = debtAccount[0];
    initialDebtAccountName = debtAccount[1].name;
  }
  const cashAccountBalances = new Map();
  for (const line of purchaseLines) {
    const isDebtAccount =
      line.coa_type === "Kewajiban Lancar" || line.coa_subtype === "Hutang";
    if (isDebtAccount) continue;
    const balance = cashAccountBalances.get(line.id_coa) || {
      amount: 0,
      name: line.coa,
    };
    balance.amount +=
      Number(line.tipe) === 0 ? Number(line.amount) : -Number(line.amount);
    cashAccountBalances.set(line.id_coa, balance);
  }
  const cashAccount = [...cashAccountBalances.entries()]
    .filter(([, balance]) => balance.amount > 0.001)
    .sort((left, right) => right[1].amount - left[1].amount)[0];
  const initialPaymentAmount = cashAccount ? cashAccount[1].amount : 0;
  const additionalPayments = payments
    .filter(
      (payment) => payment.keterangan === `Pembayaran stok masuk #${entryId}`,
    )
    .reduce((total, payment) => total + Number(payment.debit || 0), 0);
  Object.assign(entry, {
    initial_payment_amount: initialPaymentAmount,
    initial_payment_coa_id: cashAccount?.[0] ?? null,
    initial_payment_coa: cashAccount?.[1]?.name ?? "",
    initial_payment_link_id: initialPaymentLinkId,
    initial_payment_editable: initialPaymentIsEditable,
    initial_hutang_coa_id: initialDebtAccountId,
    initial_hutang_coa: initialDebtAccountName,
    additional_payments: additionalPayments,
  });

  return {
    entry,
    payments: payments.map((payment) => ({
      ...payment,
      isPayment: payment.keterangan === `Pembayaran stok masuk #${entryId}`,
      isPurchaseJournal:
        payment.keterangan === `Pembelian stok masuk #${entryId}`,
      isCorrection: payment.keterangan?.startsWith(
        `Koreksi pembelian stok masuk #${entryId}`,
      ),
    })),
    outstanding: Math.max(
      0,
      Number(entry.jumlah) * Number(entry.harga) - Number(entry.terbayar || 0),
    ),
  };
};

export const generateMissingPurchaseJournal = async ({
  id_produkmasuk,
  user,
}) => {
  const entryId = getEntryId(id_produkmasuk);
  const companyId = getCompanyId(user);
  assertCanRepairPurchaseJournal(user);

  const employeeId = user?.id_karyawan ?? null;
  return withTransaction(async (conn) => {
    const entry = await getEntry(conn, entryId, companyId, true);
    if (Number(entry.pinjaman) || entry.jenis_transaksi !== "pembelian")
      throw invalid(
        "Jurnal hanya dapat dibuat untuk pembelian non-pinjaman.",
        409,
      );

    const total = Number(entry.jumlah) * Number(entry.harga);
    if (!Number.isFinite(total) || total <= 0)
      throw invalid("Total pembelian harus lebih besar dari 0.");

    const purchaseDescription = `Pembelian stok masuk #${entryId}`;
    const [existingJournals] = await conn.execute(
      `SELECT id FROM jurnal
       WHERE id_perusahaan = ? AND keterangan = ?
       FOR UPDATE`,
      [companyId, purchaseDescription],
    );
    if (existingJournals.length)
      throw invalid(
        "Jurnal pembelian sudah ada. Pilih jurnal tersebut atau periksa transaksinya.",
        409,
      );

    const [activeLinks] = await conn.execute(
      `SELECT id FROM produkmasuk_pembayaran
       WHERE id_produkmasuk = ? AND aktif = 1
       FOR UPDATE`,
      [entryId],
    );
    if (activeLinks.length)
      throw invalid(
        "Data ini sudah memiliki jurnal aktif dan perlu diperiksa.",
        409,
      );
    if (Number(entry.terbayar || 0) > 0.001)
      throw invalid(
        "Pembayaran awal sudah tercatat; akun pembayaran harus diverifikasi manual.",
        409,
      );

    const [debtRows] = await conn.execute(
      `SELECT c.id
       FROM coa c
       INNER JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
       INNER JOIN coa_type ct ON ct.id = cs.id_coa_type
       WHERE c.nama = 'Hutang' AND c.aktif = 1
         AND cs.nama = 'Hutang' AND cs.aktif = 1
         AND ct.nama = 'Kewajiban Lancar' AND ct.aktif = 1
         AND EXISTS (
           SELECT 1
           FROM laporan l
           INNER JOIN laporan_relation lr
             ON lr.id_parent = l.id AND lr.id_child IS NULL AND lr.aktif = 1
           LEFT JOIN coa_type mapped_type ON mapped_type.id = lr.id_coa_type
           WHERE l.nama = 'Metode Bayar' AND l.aktif = 1
             AND (
               lr.id_coa = c.id
               OR lr.id_coa_subtype = c.id_coa_subtype
               OR mapped_type.id = cs.id_coa_type
             )
         )
       LIMIT 1`,
    );
    const debtCoaId = debtRows[0]?.id;
    if (!debtCoaId)
      throw invalid("COA Hutang default belum tersedia di Metode Bayar.", 409);

    const journalId = await createPurchaseJournal(conn, {
      id_produkmasuk: entryId,
      id_perusahaan: companyId,
      id_coa_kredit: debtCoaId,
      tanggal: entry.tanggal,
      amount: total,
      lunas: false,
      created_by: employeeId,
    });
    return {
      message: "Jurnal pembelian berhasil dibuat sebagai Hutang.",
      id_jurnal: journalId,
    };
  });
};

export const getAvailablePurchaseJournals = async ({
  id_produkmasuk,
  user,
}) => {
  const entryId = getEntryId(id_produkmasuk);
  const companyId = getCompanyId(user);
  assertCanRepairPurchaseJournal(user);
  const entry = await getEntry(db, entryId, companyId);
  if (Number(entry.pinjaman) || entry.jenis_transaksi !== "pembelian")
    throw invalid(
      "Jurnal hanya dapat dipilih untuk pembelian non-pinjaman.",
      409,
    );

  const total = Number(entry.jumlah) * Number(entry.harga);
  if (!Number.isFinite(total) || total <= 0)
    throw invalid("Total pembelian harus lebih besar dari 0.");

  return getCompatiblePurchaseJournals(db, {
    entryId,
    companyId,
    total,
  });
};

export const linkExistingPurchaseJournal = async (data, user) => {
  const entryId = getEntryId(data?.id_produkmasuk);
  const journalId = getEntryId(data?.id_jurnal);
  const companyId = getCompanyId(user);
  assertCanRepairPurchaseJournal(user);
  const employeeId = user?.id_karyawan ?? null;

  return withTransaction(async (conn) => {
    const entry = await getEntry(conn, entryId, companyId, true);
    if (Number(entry.pinjaman) || entry.jenis_transaksi !== "pembelian")
      throw invalid(
        "Jurnal hanya dapat dipilih untuk pembelian non-pinjaman.",
        409,
      );

    const total = Number(entry.jumlah) * Number(entry.harga);
    if (!Number.isFinite(total) || total <= 0)
      throw invalid("Total pembelian harus lebih besar dari 0.");

    const candidate = await getCompatiblePurchaseJournals(conn, {
      entryId,
      companyId,
      total,
      journalId,
    });
    if (!candidate.length)
      throw invalid(
        "Jurnal tidak tersedia atau tidak cocok dengan pembelian ini.",
        409,
      );

    const purchaseDescription = `Pembelian stok masuk #${entryId}`;
    const [currentPurchaseLinks] = await conn.execute(
      `SELECT pmp.id, pmp.id_jurnal
       FROM produkmasuk_pembayaran pmp
       INNER JOIN jurnal j ON j.id = pmp.id_jurnal
       WHERE pmp.id_produkmasuk = ? AND pmp.aktif = 1
         AND j.keterangan = ?
       FOR UPDATE`,
      [entryId, purchaseDescription],
    );
    const currentLink = currentPurchaseLinks[0];
    if (currentLink) {
      if (Number(currentLink.id_jurnal) === journalId)
        return {
          message: "Jurnal pembelian sudah tertaut.",
          id_jurnal: journalId,
        };
      throw invalid("Pembelian ini sudah memiliki jurnal aktif.", 409);
    }

    const [journalLinks] = await conn.execute(
      `SELECT id, id_produkmasuk, aktif
       FROM produkmasuk_pembayaran
       WHERE id_jurnal = ?
       FOR UPDATE`,
      [journalId],
    );
    if (journalLinks.some((link) => Number(link.id_produkmasuk) !== entryId))
      throw invalid("Jurnal sudah ditautkan ke produk masuk lain.", 409);

    const existingLink = journalLinks.find(
      (link) => Number(link.id_produkmasuk) === entryId,
    );
    if (existingLink) {
      await conn.execute(
        `UPDATE produkmasuk_pembayaran
         SET aktif = 1, updated_by = ?
         WHERE id = ?`,
        [employeeId, existingLink.id],
      );
    } else {
      await conn.execute(
        `INSERT INTO produkmasuk_pembayaran
          (id_produkmasuk, id_jurnal, created_by, updated_by)
         VALUES (?, ?, ?, ?)`,
        [entryId, journalId, employeeId, employeeId],
      );
    }

    return {
      message: "Jurnal pembelian berhasil ditautkan.",
      id_jurnal: journalId,
    };
  });
};

export const recordPayment = async (data, user) => {
  const entryId = getEntryId(data?.id_produkmasuk);
  const companyId = getCompanyId(user);
  const amount = Number(data?.amount);
  const paymentCoaId = Number(data?.id_coa_bayar);
  const date = data?.tanggal;
  const employeeId = user?.id_karyawan ?? null;

  if (!Number.isFinite(amount) || amount <= 0)
    throw invalid("Nominal pembayaran harus lebih besar dari 0.");
  if (!Number.isInteger(paymentCoaId) || paymentCoaId <= 0)
    throw invalid("Akun pembayaran wajib dipilih.");
  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw invalid("Tanggal pembayaran tidak valid.");

  const roundedAmount = Math.round(amount * 100) / 100;
  return withTransaction(async (conn) => {
    const entry = await getEntry(conn, entryId, companyId, true);
    if (entry.pinjaman)
      throw invalid("Pembayaran stok pinjaman tidak dapat dicatat.");

    const total = Number(entry.jumlah) * Number(entry.harga);
    const outstanding = Math.max(0, total - Number(entry.terbayar || 0));
    if (roundedAmount > outstanding + 0.001)
      throw invalid("Nominal pembayaran melebihi sisa hutang.");
    if (outstanding <= 0) throw invalid("Produk masuk ini sudah lunas.");

    const [payableRows] = await conn.execute(
      `SELECT t.id_coa, c.nama, cs.nama AS coa_subtype, ct.nama AS coa_type
       FROM produkmasuk_pembayaran pmp
       INNER JOIN transaksi t ON t.id_jurnal = pmp.id_jurnal AND t.tipe = 0
       INNER JOIN coa c ON c.id = t.id_coa AND c.aktif = 1
       LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
       LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
       WHERE pmp.id_produkmasuk = ? AND pmp.aktif = 1
         AND (ct.nama = 'Kewajiban Lancar' OR cs.nama = 'Hutang')
       ORDER BY pmp.id ASC, t.id ASC
       LIMIT 1`,
      [entryId],
    );
    const payableCoa = payableRows[0];
    if (!payableCoa)
      throw invalid("Jurnal hutang awal tidak ditemukan untuk produk masuk.");
    const payableIsDebtAccount =
      payableCoa.coa_type === "Kewajiban Lancar" ||
      payableCoa.coa_subtype === "Hutang";
    if (!payableIsDebtAccount)
      throw invalid("Jurnal awal tidak menggunakan akun Hutang.");
    if (String(payableCoa.id_coa) === String(paymentCoaId))
      throw invalid("Akun Hutang dan akun pembayaran tidak boleh sama.");

    const [[paymentAccountRows]] = await Promise.all([
      conn.execute(
        `SELECT c.id
         FROM coa c
         LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
         LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
         WHERE c.id = ? AND c.aktif = 1
           AND EXISTS (
             SELECT 1
             FROM laporan l
             INNER JOIN laporan_relation lr
               ON lr.id_parent = l.id AND lr.id_child IS NULL AND lr.aktif = 1
             LEFT JOIN coa_type mapped_type ON mapped_type.id = lr.id_coa_type
             WHERE l.nama = 'Metode Bayar' AND l.aktif = 1
               AND (
                 lr.id_coa = c.id
                 OR lr.id_coa_subtype = c.id_coa_subtype
                 OR mapped_type.id = cs.id_coa_type
               )
           )
         LIMIT 1`,
        [paymentCoaId],
      ),
    ]);
    if (!paymentAccountRows[0])
      throw invalid("Akun pembayaran harus berasal dari laporan Metode Bayar.");
    if (isDebtAccount(await getAccountType(conn, paymentCoaId)))
      throw invalid("Akun pembayaran harus berupa kas atau bank.");

    const [journalResult] = await conn.execute(
      `INSERT INTO jurnal
        (id_perusahaan, tanggal, keterangan, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        companyId,
        date,
        `Pembayaran stok masuk #${entryId}`,
        employeeId,
        employeeId,
      ],
    );
    const journalId = journalResult.insertId;

    await conn.execute(
      `INSERT INTO transaksi
        (id_jurnal, id_coa, tipe, amount, keterangan, created_by, updated_by)
       VALUES (?, ?, 1, ?, 'Pembayaran hutang stok masuk', ?, ?),
              (?, ?, 0, ?, 'Pembayaran stok masuk', ?, ?)`,
      [
        journalId,
        payableCoa.id_coa,
        roundedAmount,
        employeeId,
        employeeId,
        journalId,
        paymentCoaId,
        roundedAmount,
        employeeId,
        employeeId,
      ],
    );
    await conn.execute(
      `INSERT INTO produkmasuk_pembayaran
        (id_produkmasuk, id_jurnal, created_by, updated_by)
       VALUES (?, ?, ?, ?)`,
      [entryId, journalId, employeeId, employeeId],
    );
    await conn.execute(
      `UPDATE produkmasuk
       SET terbayar = COALESCE(terbayar, 0) + ?
       WHERE id = ? AND id_perusahaan = ?`,
      [roundedAmount, entryId, companyId],
    );

    return { message: "Pembayaran berhasil dicatat.", id_jurnal: journalId };
  });
};

const validatePaymentDate = (date) => {
  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw invalid("Tanggal pembayaran tidak valid.");
  return date;
};

const getPaymentForMutation = async (conn, paymentId, entryId, companyId) => {
  const [rows] = await conn.execute(
    `SELECT pmp.id, pmp.id_produkmasuk, pmp.id_jurnal, j.tanggal,
            j.keterangan,
            DATE_FORMAT(j.tanggal, '%Y-%m') AS payment_month,
            DATE_FORMAT(CURRENT_DATE(), '%Y-%m') AS current_month
     FROM produkmasuk_pembayaran pmp
     INNER JOIN jurnal j ON j.id = pmp.id_jurnal
     WHERE pmp.id = ? AND pmp.id_produkmasuk = ? AND pmp.aktif = 1
       AND j.id_perusahaan = ?
     FOR UPDATE`,
    [paymentId, entryId, companyId],
  );
  const payment = rows[0];
  if (!payment) throw invalid("Pembayaran tidak ditemukan.", 404);
  if (payment.keterangan !== `Pembayaran stok masuk #${entryId}`)
    throw invalid("Jurnal ini bukan pembayaran produk masuk.");
  if (payment.payment_month !== payment.current_month)
    throw invalid(
      "Pembayaran hanya dapat diubah pada bulan pencatatannya.",
      409,
    );

  const [lines] = await conn.execute(
    `SELECT id, id_coa, tipe, amount
     FROM transaksi
     WHERE id_jurnal = ?
     ORDER BY id ASC
     FOR UPDATE`,
    [payment.id_jurnal],
  );
  const debit = lines.find((line) => Number(line.tipe) === 1);
  const credit = lines.find((line) => Number(line.tipe) === 0);
  if (
    lines.length !== 2 ||
    !debit ||
    !credit ||
    Math.abs(Number(debit.amount) - Number(credit.amount)) > 0.001
  )
    throw invalid("Jurnal pembayaran tidak valid dan tidak dapat diubah.");

  return { ...payment, debit, credit, amount: Number(debit.amount) };
};

const validatePaymentAccount = async (conn, paymentCoaId, debtCoaId) => {
  if (!Number.isInteger(paymentCoaId) || paymentCoaId <= 0)
    throw invalid("Akun pembayaran wajib dipilih.");
  if (String(paymentCoaId) === String(debtCoaId))
    throw invalid("Akun Hutang dan akun pembayaran tidak boleh sama.");

  const [rows] = await conn.execute(
    `SELECT c.id
     FROM coa c
     LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
     LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
     WHERE c.id = ? AND c.aktif = 1
       AND EXISTS (
         SELECT 1
         FROM laporan l
         INNER JOIN laporan_relation lr
           ON lr.id_parent = l.id AND lr.id_child IS NULL AND lr.aktif = 1
         LEFT JOIN coa_type mapped_type ON mapped_type.id = lr.id_coa_type
         WHERE l.nama = 'Metode Bayar' AND l.aktif = 1
           AND (
             lr.id_coa = c.id
             OR lr.id_coa_subtype = c.id_coa_subtype
             OR mapped_type.id = cs.id_coa_type
           )
       )
     LIMIT 1`,
    [paymentCoaId],
  );
  if (!rows[0])
    throw invalid("Akun pembayaran harus berasal dari laporan Metode Bayar.");
};

const getAccountType = async (conn, coaId) => {
  const [rows] = await conn.execute(
    `SELECT c.id, c.nama, cs.nama AS coa_subtype, ct.nama AS coa_type
     FROM coa c
     LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
     LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
     WHERE c.id = ? AND c.aktif = 1
     LIMIT 1`,
    [coaId],
  );
  return rows[0] ?? null;
};

const isDebtAccount = (account) =>
  account?.coa_type === "Kewajiban Lancar" || account?.coa_subtype === "Hutang";

export const excludeZeroAmountLines = (lines) =>
  lines.filter((line) => Number(line.amount) > 0);

const updateInitialPurchasePayment = async (paymentId, data, user) => {
  const entryId = getEntryId(data?.id_produkmasuk);
  const companyId = getCompanyId(user);
  const normalizedPaymentId = getEntryId(paymentId);
  const amount = Number(data?.amount);
  const roundedAmount = Math.round(amount * 100) / 100;
  const paymentCoaId = data?.id_coa_bayar ? Number(data.id_coa_bayar) : null;
  const employeeId = user?.id_karyawan ?? null;

  if (!Number.isFinite(amount) || amount < 0)
    throw invalid("Nominal pembayaran tidak valid.");

  return withTransaction(async (conn) => {
    const entry = await getEntry(conn, entryId, companyId, true);
    const [linkRows] = await conn.execute(
      `SELECT pmp.id, pmp.id_jurnal, j.id_jurnal_form, j.keterangan,
              DATE_FORMAT(j.tanggal, '%Y-%m') AS journal_month,
              DATE_FORMAT(CURRENT_DATE(), '%Y-%m') AS current_month
       FROM produkmasuk_pembayaran pmp
       INNER JOIN jurnal j ON j.id = pmp.id_jurnal
       WHERE pmp.id_produkmasuk = ? AND pmp.aktif = 1
         AND (j.keterangan = ? OR j.keterangan = ?)
       ORDER BY pmp.id ASC
       FOR UPDATE`,
      [
        entryId,
        `Pembelian stok masuk #${entryId}`,
        `Koreksi pembelian stok masuk #${entryId}`,
      ],
    );
    const sourceLink = linkRows.find(
      (link) =>
        Number(link.id) === normalizedPaymentId &&
        link.keterangan === `Pembelian stok masuk #${entryId}`,
    );
    if (!sourceLink)
      throw invalid("Jurnal pembayaran awal tidak ditemukan.", 404);

    const purchaseJournalIds = linkRows.map((link) => link.id_jurnal);
    const placeholders = purchaseJournalIds.map(() => "?").join(", ");
    const [purchaseLines] = await conn.execute(
      `SELECT t.id, t.id_jurnal, t.id_coa, t.tipe, t.amount, t.keterangan,
              c.nama AS coa, cs.nama AS coa_subtype, ct.nama AS coa_type
       FROM transaksi t
       INNER JOIN coa c ON c.id = t.id_coa
       LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
       LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
       WHERE t.id_jurnal IN (${placeholders})
       ORDER BY t.id ASC
       FOR UPDATE`,
      purchaseJournalIds,
    );
    const originalLines = purchaseLines.filter(
      (line) => Number(line.id_jurnal) === Number(sourceLink.id_jurnal),
    );
    const inventoryLine = originalLines.find((line) => Number(line.tipe) === 1);
    const originalCashLine = originalLines.find(
      (line) => Number(line.tipe) === 0 && !isDebtAccount(line),
    );
    if (!inventoryLine)
      throw invalid("Jurnal pembelian tidak memiliki transaksi Persediaan.");

    const cashBalances = new Map();
    for (const line of purchaseLines) {
      if (isDebtAccount(line)) continue;
      const balance = cashBalances.get(line.id_coa) || 0;
      cashBalances.set(
        line.id_coa,
        balance +
          (Number(line.tipe) === 0
            ? Number(line.amount)
            : -Number(line.amount)),
      );
    }
    const [repaymentRows] = await conn.execute(
      `SELECT COALESCE(SUM(CASE WHEN t.tipe = 1 THEN t.amount ELSE 0 END), 0) AS amount
       FROM produkmasuk_pembayaran pmp
       INNER JOIN jurnal j ON j.id = pmp.id_jurnal
       INNER JOIN transaksi t ON t.id_jurnal = j.id
       WHERE pmp.id_produkmasuk = ? AND pmp.aktif = 1
         AND j.keterangan = ?`,
      [entryId, `Pembayaran stok masuk #${entryId}`],
    );
    const additionalPayments = Number(repaymentRows[0]?.amount ?? 0);
    const total = Number(entry.jumlah) * Number(entry.harga);
    if (roundedAmount + additionalPayments > total + 0.001)
      throw invalid("Nominal pembayaran melebihi total pembelian.");

    const outstandingAtPurchase = total - roundedAmount;
    let debtCoaId = null;
    if (roundedAmount > 0) {
      if (!Number.isInteger(paymentCoaId) || paymentCoaId <= 0)
        throw invalid("Akun kas/bank pembayaran wajib dipilih.");
      await validatePaymentAccount(conn, paymentCoaId, inventoryLine.id_coa);
      if (isDebtAccount(await getAccountType(conn, paymentCoaId)))
        throw invalid("Akun pembayaran harus berupa kas atau bank.");
    }
    if (outstandingAtPurchase > 0.001) {
      const [debtRows] = await conn.execute(
        `SELECT c.id
         FROM coa c
         INNER JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
         INNER JOIN coa_type ct ON ct.id = cs.id_coa_type
         WHERE c.nama = 'Hutang' AND c.aktif = 1
           AND cs.nama = 'Hutang' AND cs.aktif = 1
           AND ct.nama = 'Kewajiban Lancar' AND ct.aktif = 1
           AND EXISTS (
             SELECT 1
             FROM laporan l
             INNER JOIN laporan_relation lr
               ON lr.id_parent = l.id AND lr.id_child IS NULL AND lr.aktif = 1
             LEFT JOIN coa_type mapped_type ON mapped_type.id = lr.id_coa_type
             WHERE l.nama = 'Metode Bayar' AND l.aktif = 1
               AND (
                 lr.id_coa = c.id
                 OR lr.id_coa_subtype = c.id_coa_subtype
                 OR mapped_type.id = cs.id_coa_type
               )
           )
         LIMIT 1`,
      );
      debtCoaId = debtRows[0]?.id;
      if (!debtCoaId)
        throw invalid("COA Hutang default belum tersedia di Metode Bayar.");
      await validatePaymentAccount(conn, debtCoaId, inventoryLine.id_coa);
      if (!isDebtAccount(await getAccountType(conn, debtCoaId)))
        throw invalid("Akun sisa pembelian harus berupa Hutang.");
    }
    if (paymentCoaId && debtCoaId && paymentCoaId === Number(debtCoaId))
      throw invalid("Akun kas/bank dan Hutang tidak boleh sama.");

    const correctionLines = excludeZeroAmountLines(
      purchaseLines.map((line) => ({
        id_coa: line.id_coa,
        tipe: Number(line.tipe) === 1 ? 0 : 1,
        amount: Number(line.amount),
        keterangan: `Pembalikan: ${line.keterangan || "Jurnal pembelian"}`,
      })),
    );
    const newPurchaseLines = excludeZeroAmountLines([
      {
        id_coa: inventoryLine.id_coa,
        tipe: 1,
        amount: total,
        keterangan: "Persediaan",
      },
      {
        id_coa: paymentCoaId || originalCashLine?.id_coa,
        tipe: 0,
        amount: roundedAmount,
        keterangan: "Pembayaran awal pembelian",
      },
      ...(outstandingAtPurchase > 0.001
        ? [
            {
              id_coa: debtCoaId,
              tipe: 0,
              amount: outstandingAtPurchase,
              keterangan: "Sisa hutang pembelian",
            },
          ]
        : []),
    ]);
    const sameMonth =
      sourceLink.journal_month === sourceLink.current_month &&
      linkRows.every((link) => link.journal_month === link.current_month);

    if (sameMonth) {
      const correctionLinks = linkRows.filter(
        (link) => link.keterangan !== `Pembelian stok masuk #${entryId}`,
      );
      const correctionJournalIds = correctionLinks.map(
        (link) => link.id_jurnal,
      );
      if (correctionJournalIds.length) {
        const correctionPlaceholders = correctionJournalIds
          .map(() => "?")
          .join(", ");
        const correctionLinkIds = correctionLinks.map((link) => link.id);
        const correctionLinkPlaceholders = correctionLinkIds
          .map(() => "?")
          .join(", ");
        await conn.execute(
          `DELETE FROM produkmasuk_pembayaran WHERE id IN (${correctionLinkPlaceholders})`,
          correctionLinkIds,
        );
        await conn.execute(
          `DELETE FROM transaksi WHERE id_jurnal IN (${correctionPlaceholders})`,
          correctionJournalIds,
        );
        await conn.execute(
          `DELETE FROM jurnal WHERE id IN (${correctionPlaceholders})`,
          correctionJournalIds,
        );
      }
      await conn.execute("DELETE FROM transaksi WHERE id_jurnal = ?", [
        sourceLink.id_jurnal,
      ]);
      const values = [];
      const transactionPlaceholders = newPurchaseLines
        .map((line) => {
          values.push(
            sourceLink.id_jurnal,
            line.id_coa,
            line.tipe,
            line.amount,
            line.keterangan,
            employeeId,
            employeeId,
          );
          return "(?, ?, ?, ?, ?, ?, ?)";
        })
        .join(", ");
      await conn.execute(
        `INSERT INTO transaksi
          (id_jurnal, id_coa, tipe, amount, keterangan, created_by, updated_by)
         VALUES ${transactionPlaceholders}`,
        values,
      );
      await conn.execute(
        `UPDATE jurnal SET updated_by = COALESCE(?, updated_by) WHERE id = ?`,
        [employeeId, sourceLink.id_jurnal],
      );
    } else {
      await createCorrectionJournal(conn, {
        id_jurnal_form: sourceLink.id_jurnal_form,
        id_perusahaan: companyId,
        id_produkmasuk: entryId,
        keterangan: `Koreksi pembelian stok masuk #${entryId}`,
        lines: [...correctionLines, ...newPurchaseLines],
        updated_by: employeeId,
      });
    }

    await conn.execute(
      `UPDATE produkmasuk
       SET terbayar = ?
       WHERE id = ? AND id_perusahaan = ?`,
      [roundedAmount + additionalPayments, entryId, companyId],
    );

    return { message: "Pembayaran awal berhasil diperbarui." };
  });
};

export const updatePayment = async (paymentId, data, user) => {
  if (data?.kind === "purchase")
    return updateInitialPurchasePayment(paymentId, data, user);
  const entryId = getEntryId(data?.id_produkmasuk);
  const companyId = getCompanyId(user);
  const normalizedPaymentId = getEntryId(paymentId);
  const amount = Number(data?.amount);
  const paymentCoaId = Number(data?.id_coa_bayar);
  const date = validatePaymentDate(data?.tanggal);
  const roundedAmount = Math.round(amount * 100) / 100;
  const employeeId = user?.id_karyawan ?? null;

  if (!Number.isFinite(amount) || amount <= 0)
    throw invalid("Nominal pembayaran harus lebih besar dari 0.");

  return withTransaction(async (conn) => {
    const entry = await getEntry(conn, entryId, companyId, true);
    const payment = await getPaymentForMutation(
      conn,
      normalizedPaymentId,
      entryId,
      companyId,
    );
    if (date.slice(0, 7) !== payment.current_month)
      throw invalid("Tanggal pembayaran harus tetap pada bulan berjalan.", 409);

    await validatePaymentAccount(conn, paymentCoaId, payment.debit.id_coa);
    if (isDebtAccount(await getAccountType(conn, paymentCoaId)))
      throw invalid("Akun pembayaran harus berupa kas atau bank.");
    const total = Number(entry.jumlah) * Number(entry.harga);
    const available = total - Number(entry.terbayar || 0) + payment.amount;
    if (roundedAmount > available + 0.001)
      throw invalid("Nominal pembayaran melebihi sisa hutang.");

    await conn.execute(
      `UPDATE jurnal
       SET tanggal = ?, updated_by = ?
       WHERE id = ? AND id_perusahaan = ?`,
      [date, employeeId, payment.id_jurnal, companyId],
    );
    await conn.execute(
      `UPDATE transaksi
       SET amount = ?, updated_by = ?
       WHERE id = ? AND id_jurnal = ?`,
      [roundedAmount, employeeId, payment.debit.id, payment.id_jurnal],
    );
    await conn.execute(
      `UPDATE transaksi
       SET id_coa = ?, amount = ?, updated_by = ?
       WHERE id = ? AND id_jurnal = ?`,
      [
        paymentCoaId,
        roundedAmount,
        employeeId,
        payment.credit.id,
        payment.id_jurnal,
      ],
    );
    await conn.execute(
      `UPDATE produkmasuk_pembayaran
       SET updated_by = ?
       WHERE id = ? AND id_produkmasuk = ?`,
      [employeeId, normalizedPaymentId, entryId],
    );
    await conn.execute(
      `UPDATE produkmasuk
       SET terbayar = ?
       WHERE id = ? AND id_perusahaan = ?`,
      [
        Number(entry.terbayar || 0) - payment.amount + roundedAmount,
        entryId,
        companyId,
      ],
    );

    return { message: "Pembayaran berhasil diperbarui." };
  });
};

export const deletePayment = async (paymentId, data, user) => {
  const entryId = getEntryId(data?.id_produkmasuk);
  const companyId = getCompanyId(user);
  const normalizedPaymentId = getEntryId(paymentId);
  const employeeId = user?.id_karyawan ?? null;

  return withTransaction(async (conn) => {
    const _entry = await getEntry(conn, entryId, companyId, true);
    const payment = await getPaymentForMutation(
      conn,
      normalizedPaymentId,
      entryId,
      companyId,
    );

    await conn.execute(
      "DELETE FROM produkmasuk_pembayaran WHERE id = ? AND id_produkmasuk = ?",
      [normalizedPaymentId, entryId],
    );
    await conn.execute("DELETE FROM transaksi WHERE id_jurnal = ?", [
      payment.id_jurnal,
    ]);
    await conn.execute(
      "DELETE FROM jurnal WHERE id = ? AND id_perusahaan = ?",
      [payment.id_jurnal, companyId],
    );
    await conn.execute(
      `UPDATE produkmasuk
       SET terbayar = GREATEST(0, COALESCE(terbayar, 0) - ?)
       WHERE id = ? AND id_perusahaan = ?`,
      [payment.amount, entryId, companyId],
    );

    return { message: "Pembayaran berhasil dihapus.", updated_by: employeeId };
  });
};
