const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildBorrowerReturnLines,
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
