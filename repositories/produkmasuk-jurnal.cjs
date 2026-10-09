const createPurchaseJournal = async (
  conn,
  {
    id_produkmasuk,
    id_perusahaan,
    id_coa_kredit,
    tanggal,
    amount,
    lunas,
    created_by,
  },
) => {
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error("Total pembelian harus lebih besar dari 0.");
  }
  const creditCoaId = Number(id_coa_kredit);
  if (!Number.isInteger(creditCoaId) || creditCoaId <= 0) {
    throw new Error("Akun kredit pembelian wajib dipilih.");
  }

  const [[formRows], [inventoryRows], [creditRows]] = await Promise.all([
    conn.execute(
      "SELECT id FROM jurnal_form WHERE system_key = 'PEMBELIAN' AND aktif = 1 LIMIT 1",
    ),
    conn.execute(
      `SELECT c.id
       FROM coa_type ct
       INNER JOIN coa_subtype cs ON cs.id_coa_type = ct.id
       INNER JOIN coa c ON c.id_coa_subtype = cs.id
       WHERE ct.nama = 'Aktiva Lancar' AND ct.aktif = 1
         AND cs.nama = 'Persediaan' AND cs.aktif = 1
         AND c.nama = 'Persediaan' AND c.aktif = 1
       LIMIT 1`,
    ),
    conn.execute(
      `SELECT c.id, cs.nama coa_subtype, ct.nama coa_type
       FROM coa c
       LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
       LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
       WHERE c.id = ? AND c.aktif = 1
         AND EXISTS (
           SELECT 1
           FROM laporan l
           INNER JOIN laporan_relation lr
             ON lr.id_parent = l.id AND lr.id_child IS NULL AND lr.aktif = 1
           LEFT JOIN coa_type mapped_type
             ON mapped_type.id = lr.id_coa_type
           WHERE l.nama = 'Metode Bayar' AND l.aktif = 1
             AND (
               lr.id_coa = c.id
               OR lr.id_coa_subtype = c.id_coa_subtype
               OR mapped_type.id = cs.id_coa_type
             )
         )
       LIMIT 1`,
      [creditCoaId],
    ),
  ]);
  const journalForm = formRows[0];
  const inventoryCoa = inventoryRows[0];
  const creditCoa = creditRows[0];

  if (!journalForm) throw new Error("Jurnal form Pembelian belum tersedia.");
  if (!inventoryCoa) throw new Error("COA Persediaan belum tersedia.");
  if (!creditCoa) {
    throw new Error("Akun kredit harus berasal dari laporan Metode Bayar.");
  }

  const isDebtAccount =
    creditCoa.coa_type === "Kewajiban Lancar" ||
    creditCoa.coa_subtype === "Hutang";
  if (lunas && isDebtAccount) {
    throw new Error("Akun Hutang tidak dapat dipilih untuk pembelian Lunas.");
  }
  if (!lunas && !isDebtAccount) {
    throw new Error("Pembelian Hutang harus menggunakan akun Hutang.");
  }
  if (String(inventoryCoa.id) === String(creditCoa.id)) {
    throw new Error("Akun debit dan kredit pembelian tidak boleh sama.");
  }

  const [journalResult] = await conn.execute(
    `INSERT INTO jurnal
      (id_jurnal_form, id_perusahaan, tanggal, keterangan, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      journalForm.id,
      id_perusahaan,
      tanggal,
      `Pembelian stok masuk #${id_produkmasuk}`,
      created_by,
      created_by,
    ],
  );
  const journalId = journalResult.insertId;

  await conn.execute(
    `INSERT INTO transaksi
      (id_jurnal, id_coa, tipe, amount, keterangan, created_by, updated_by)
     VALUES (?, ?, 1, ?, 'Persediaan', ?, ?),
            (?, ?, 0, ?, 'Pembayaran pembelian', ?, ?)`,
    [
      journalId,
      inventoryCoa.id,
      amount,
      created_by,
      created_by,
      journalId,
      creditCoa.id,
      amount,
      created_by,
      created_by,
    ],
  );

  await conn.execute(
    `INSERT INTO produkmasuk_pembayaran
      (id_produkmasuk, id_jurnal, created_by, updated_by)
     VALUES (?, ?, ?, ?)`,
    [id_produkmasuk, journalId, created_by, created_by],
  );

  return journalId;
};

module.exports = { createPurchaseJournal };
