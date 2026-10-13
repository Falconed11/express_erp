const loadAccountIds = async (conn) => {
  const [rows] = await conn.execute(
    `SELECT c.nama, c.id
     FROM coa c
     INNER JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
     INNER JOIN coa_type ct ON ct.id = cs.id_coa_type
     WHERE c.aktif = 1 AND cs.aktif = 1 AND ct.aktif = 1
       AND (
         (c.nama = 'Persediaan' AND cs.nama = 'Persediaan' AND ct.nama = 'Aktiva Lancar')
         OR (c.nama = 'Piutang Antarperusahaan' AND cs.nama = 'Piutang Antarperusahaan' AND ct.nama = 'Aktiva Lancar')
         OR (c.nama = 'Hutang Antarperusahaan' AND cs.nama = 'Hutang Antarperusahaan' AND ct.nama = 'Kewajiban Lancar')
         OR (c.nama = 'Untung Selisih Pinjaman' AND cs.nama = 'Untung Selisih Pinjaman' AND ct.nama = 'Pendapatan')
         OR (c.nama = 'Rugi Selisih Pinjaman' AND cs.nama = 'Rugi Selisih Pinjaman' AND ct.nama = 'Biaya Operasional')
       )`,
  );
  const names = {
    Persediaan: "Persediaan",
    PiutangAntarperusahaan: "Piutang Antarperusahaan",
    HutangAntarperusahaan: "Hutang Antarperusahaan",
    KeuntunganSelisih: "Untung Selisih Pinjaman",
    KerugianSelisih: "Rugi Selisih Pinjaman",
  };
  const accounts = Object.fromEntries(
    Object.entries(names).map(([key, name]) => [
      key,
      rows.find((row) => row.nama === name)?.id,
    ]),
  );
  const required = Object.keys(names);
  const missing = required.filter((name) => !accounts[name]);
  if (missing.length)
    throw new Error(
      `COA pinjaman stok belum tersedia: ${missing
        .map((key) => names[key])
        .join(", ")}.`,
    );
  return accounts;
};

const createJournal = async (
  conn,
  { id_perusahaan, tanggal, keterangan, created_by, lines },
) => {
  const [journalResult] = await conn.execute(
    `INSERT INTO jurnal
      (id_perusahaan, tanggal, keterangan, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id_perusahaan,
      tanggal,
      keterangan,
      created_by ?? null,
      created_by ?? null,
    ],
  );
  const journalId = journalResult.insertId;
  for (const line of lines) {
    await conn.execute(
      `INSERT INTO transaksi
        (id_jurnal, id_coa, tipe, amount, keterangan, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        journalId,
        line.id_coa,
        line.tipe,
        line.amount,
        line.keterangan,
        created_by ?? null,
        created_by ?? null,
      ],
    );
  }
  return journalId;
};

const money = (value) => Number(Number(value).toFixed(2));

const buildBorrowerReturnLines = (accounts, loanAmount, returnedAmount) => {
  const variance = money(Math.abs(loanAmount - returnedAmount));
  const lines = [
    {
      id_coa: accounts.HutangAntarperusahaan,
      tipe: 1,
      amount: loanAmount,
      keterangan: "Pelunasan hutang pinjaman stok",
    },
  ];
  if (returnedAmount < loanAmount) {
    lines.push(
      {
        id_coa: accounts.Persediaan,
        tipe: 0,
        amount: returnedAmount,
        keterangan: "Persediaan stok pengganti dikembalikan",
      },
      {
        id_coa: accounts.KeuntunganSelisih,
        tipe: 0,
        amount: variance,
        keterangan: "Keuntungan selisih pengembalian pinjaman",
      },
    );
  } else if (returnedAmount > loanAmount) {
    lines.push(
      {
        id_coa: accounts.KerugianSelisih,
        tipe: 1,
        amount: variance,
        keterangan: "Kerugian selisih pengembalian pinjaman",
      },
      {
        id_coa: accounts.Persediaan,
        tipe: 0,
        amount: returnedAmount,
        keterangan: "Persediaan stok pengganti dikembalikan",
      },
    );
  } else {
    lines.push({
      id_coa: accounts.Persediaan,
      tipe: 0,
      amount: returnedAmount,
      keterangan: "Persediaan stok pengganti dikembalikan",
    });
  }
  return lines;
};

const createLoanJournals = async (
  conn,
  {
    id_produkpinjaman,
    id_perusahaan_pemberi,
    id_perusahaan_peminjam,
    jumlah,
    harga,
    tanggal,
    created_by,
  },
) => {
  const accounts = await loadAccountIds(conn);
  const amount = money(Number(jumlah) * Number(harga));
  const lenderJournalId = await createJournal(conn, {
    id_perusahaan: id_perusahaan_pemberi,
    tanggal,
    keterangan: `Pinjaman stok #${id_produkpinjaman} (pemberi #${id_perusahaan_pemberi}, peminjam #${id_perusahaan_peminjam})`,
    created_by,
    lines: [
      {
        id_coa: accounts.PiutangAntarperusahaan,
        tipe: 1,
        amount,
        keterangan: "Piutang pinjaman stok",
      },
      {
        id_coa: accounts.Persediaan,
        tipe: 0,
        amount,
        keterangan: "Persediaan dipinjamkan",
      },
    ],
  });
  const borrowerJournalId = await createJournal(conn, {
    id_perusahaan: id_perusahaan_peminjam,
    tanggal,
    keterangan: `Pinjaman stok #${id_produkpinjaman} (pemberi #${id_perusahaan_pemberi}, peminjam #${id_perusahaan_peminjam})`,
    created_by,
    lines: [
      {
        id_coa: accounts.Persediaan,
        tipe: 1,
        amount,
        keterangan: "Persediaan pinjaman diterima",
      },
      {
        id_coa: accounts.HutangAntarperusahaan,
        tipe: 0,
        amount,
        keterangan: "Hutang pinjaman stok",
      },
    ],
  });
  await conn.execute(
    `UPDATE produkpinjaman
     SET id_jurnal_pemberi = ?, id_jurnal_peminjam = ?
     WHERE id = ?`,
    [lenderJournalId, borrowerJournalId, id_produkpinjaman],
  );
};

const createReturnJournals = async (
  conn,
  {
    id_produkpinjamanpengembalian,
    id_produkpinjaman,
    id_perusahaan_pemberi,
    id_perusahaan_peminjam,
    jumlah,
    harga_pinjaman,
    harga_peminjam,
    tanggal,
    created_by,
  },
) => {
  const accounts = await loadAccountIds(conn);
  const loanAmount = money(Number(jumlah) * Number(harga_pinjaman));
  const returnedAmount = money(Number(jumlah) * Number(harga_peminjam));
  const description = `Pengembalian pinjaman #${id_produkpinjaman} retur #${id_produkpinjamanpengembalian} (pemberi #${id_perusahaan_pemberi}, peminjam #${id_perusahaan_peminjam})`;
  const lenderJournalId = await createJournal(conn, {
    id_perusahaan: id_perusahaan_pemberi,
    tanggal,
    keterangan: description,
    created_by,
    lines: [
      {
        id_coa: accounts.Persediaan,
        tipe: 1,
        amount: loanAmount,
        keterangan: "Persediaan pinjaman dikembalikan",
      },
      {
        id_coa: accounts.PiutangAntarperusahaan,
        tipe: 0,
        amount: loanAmount,
        keterangan: "Pelunasan piutang pinjaman stok",
      },
    ],
  });

  const borrowerJournalId = await createJournal(conn, {
    id_perusahaan: id_perusahaan_peminjam,
    tanggal,
    keterangan: description,
    created_by,
    lines: buildBorrowerReturnLines(accounts, loanAmount, returnedAmount),
  });
  await conn.execute(
    `UPDATE produkpinjamanpengembalian
     SET id_jurnal_pemberi = ?, id_jurnal_peminjam = ?
     WHERE id = ?`,
    [lenderJournalId, borrowerJournalId, id_produkpinjamanpengembalian],
  );
};

const reverseJournal = async (conn, id_jurnal, { updated_by, reference }) => {
  const [journalRows] = await conn.execute(
    `SELECT id, id_perusahaan, id_jurnal_form,
            DATE_FORMAT(tanggal, '%Y-%m') AS journal_month,
            DATE_FORMAT(CURRENT_DATE(), '%Y-%m') AS current_month
     FROM jurnal WHERE id = ? FOR UPDATE`,
    [id_jurnal],
  );
  const journal = journalRows[0];
  if (!journal) return null;
  const [lines] = await conn.execute(
    `SELECT id_coa, tipe, amount, keterangan
     FROM transaksi WHERE id_jurnal = ? FOR UPDATE`,
    [id_jurnal],
  );
  if (!lines.length)
    throw new Error("Jurnal pinjaman tidak memiliki transaksi.");

  if (journal.journal_month === journal.current_month) {
    await conn.execute("DELETE FROM transaksi WHERE id_jurnal = ?", [
      id_jurnal,
    ]);
    await conn.execute("DELETE FROM jurnal WHERE id = ?", [id_jurnal]);
    return null;
  }

  return createJournal(conn, {
    id_perusahaan: journal.id_perusahaan,
    tanggal: new Date().toISOString().slice(0, 10),
    keterangan: `Koreksi pembatalan ${reference} (jurnal #${id_jurnal})`,
    created_by: updated_by,
    lines: lines.map((line) => ({
      id_coa: line.id_coa,
      tipe: Number(line.tipe) === 1 ? 0 : 1,
      amount: Number(line.amount),
      keterangan: `Pembalikan: ${line.keterangan || reference}`,
    })),
  });
};

module.exports = {
  buildBorrowerReturnLines,
  createLoanJournals,
  createReturnJournals,
  reverseJournal,
};
