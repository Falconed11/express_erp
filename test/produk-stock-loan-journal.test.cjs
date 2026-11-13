const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildBorrowerReturnLines,
  createReturnJournals,
  reverseJournal,
} = require("../src/modules/produk-stock/produk-stock-journal.cjs");

const accounts = {
  Persediaan: 1,
  HutangAntarperusahaan: 3,
};

const totals = (lines) =>
  lines.reduce(
    (amounts, line) => {
      amounts[Number(line.tipe) === 1 ? "debit" : "credit"] += line.amount;
      return amounts;
    },
    { debit: 0, credit: 0 },
  );

test("borrower return clears the loan at its original book value", () => {
  const lines = buildBorrowerReturnLines(accounts, 1000);

  assert.deepEqual(totals(lines), { debit: 1000, credit: 1000 });
  assert.deepEqual(
    lines.map(({ id_coa, tipe, amount }) => ({ id_coa, tipe, amount })),
    [
      { id_coa: accounts.HutangAntarperusahaan, tipe: 1, amount: 1000 },
      { id_coa: accounts.Persediaan, tipe: 0, amount: 1000 },
    ],
  );
});

const createReturnJournalTransactions = async (harga_peminjam) => {
  const statements = [];
  let nextJournalId = 100;
  const connection = {
    execute: async (sql, values) => {
      statements.push({ sql, values });
      if (/SELECT c\.nama, c\.id/.test(sql)) {
        return [
          [
            { nama: "Persediaan", id: 1 },
            { nama: "Piutang Antarperusahaan", id: 2 },
            { nama: "Hutang Antarperusahaan", id: 3 },
          ],
        ];
      }
      if (/INSERT INTO jurnal/.test(sql))
        return [{ insertId: nextJournalId++ }];
      return [{ affectedRows: 1 }];
    },
  };

  await createReturnJournals(connection, {
    id_produkpinjamanpengembalian: 11,
    id_produkpinjaman: 12,
    id_perusahaan_pemberi: 1,
    id_perusahaan_peminjam: 2,
    jumlah: 1,
    harga_pinjaman: 1000,
    harga_peminjam,
    tanggal: "2026-10-01",
  });

  return statements
    .filter(({ sql }) => /INSERT INTO transaksi/.test(sql))
    .map(({ values }) => values);
};

test("returning stock at a different cost posts no gain or loss", async () => {
  const cheaperReturn = await createReturnJournalTransactions(800);
  const moreExpensiveReturn = await createReturnJournalTransactions(1200);
  const borrowerLines = (transactions) =>
    transactions.slice(2).map(([, id_coa, tipe, amount]) => ({
      id_coa,
      tipe,
      amount,
    }));

  assert.deepEqual(borrowerLines(cheaperReturn), [
    { id_coa: accounts.HutangAntarperusahaan, tipe: 1, amount: 1000 },
    { id_coa: accounts.Persediaan, tipe: 0, amount: 1000 },
  ]);
  assert.deepEqual(borrowerLines(moreExpensiveReturn), [
    { id_coa: accounts.HutangAntarperusahaan, tipe: 1, amount: 1000 },
    { id_coa: accounts.Persediaan, tipe: 0, amount: 1000 },
  ]);
});

test("reversal journal links to the original journal", async () => {
  const statements = [];
  const connection = {
    execute: async (sql, values) => {
      statements.push({ sql, values });
      if (/FROM jurnal WHERE id =/.test(sql)) {
        return [
          [
            {
              id: 57,
              id_perusahaan: 2,
              id_jurnal_form: null,
              journal_month: "2025-01",
              current_month: "2026-10",
            },
          ],
        ];
      }
      if (/FROM transaksi WHERE id_jurnal =/.test(sql)) {
        return [[{ id_coa: 5, tipe: 1, amount: 100, keterangan: "Loan" }]];
      }
      if (/INSERT INTO jurnal/.test(sql)) return [{ insertId: 88 }];
      return [{ affectedRows: 1 }];
    },
  };

  const reversalId = await reverseJournal(connection, 57, {
    updated_by: 9,
    reference: "cancel loan #5",
  });

  assert.equal(reversalId, 88);
  const insertJournal = statements.find(({ sql }) =>
    /INSERT INTO jurnal/.test(sql),
  );
  assert.equal(insertJournal.values[1], 57);
  const insertTransaction = statements.find(({ sql }) =>
    /INSERT INTO transaksi/.test(sql),
  );
  assert.equal(insertTransaction.values[2], 0);
});
