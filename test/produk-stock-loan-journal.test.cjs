const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildBorrowerReturnLines,
  reverseJournal,
} = require("../src/modules/produk-stock/produk-stock-journal.cjs");

const accounts = {
  Persediaan: 1,
  HutangAntarperusahaan: 2,
  KeuntunganSelisih: 3,
  KerugianSelisih: 4,
};

const totals = (lines) =>
  lines.reduce(
    (amounts, line) => {
      amounts[Number(line.tipe) === 1 ? "debit" : "credit"] += line.amount;
      return amounts;
    },
    { debit: 0, credit: 0 },
  );

test("cheaper returned stock clears the loan and recognizes a gain", () => {
  const lines = buildBorrowerReturnLines(accounts, 1000, 800);

  assert.deepEqual(totals(lines), { debit: 1000, credit: 1000 });
  assert.equal(lines[1].id_coa, accounts.Persediaan);
  assert.equal(lines[2].id_coa, accounts.KeuntunganSelisih);
  assert.equal(lines[2].amount, 200);
});

test("equal-cost returned stock clears the loan without a variance", () => {
  const lines = buildBorrowerReturnLines(accounts, 1000, 1000);

  assert.deepEqual(totals(lines), { debit: 1000, credit: 1000 });
  assert.equal(lines.length, 2);
});

test("more expensive returned stock clears the loan and recognizes a loss", () => {
  const lines = buildBorrowerReturnLines(accounts, 1000, 1200);

  assert.deepEqual(totals(lines), { debit: 1200, credit: 1200 });
  assert.equal(lines[1].id_coa, accounts.KerugianSelisih);
  assert.equal(lines[1].amount, 200);
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
