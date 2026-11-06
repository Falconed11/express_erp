import test from "node:test";
import assert from "node:assert/strict";
import {
  excludeZeroAmountLines,
  getCompatiblePurchaseJournals,
  isPurchaseJournalShape,
} from "./produkmasuk-pembayaran.repository.js";

test("purchase journal lines omit zero-valued accounts", () => {
  const lines = excludeZeroAmountLines([
    { id_coa: 10, tipe: 1, amount: 100 },
    { id_coa: 20, tipe: 0, amount: 0 },
    { id_coa: 30, tipe: 0, amount: 100 },
  ]);

  assert.deepEqual(lines, [
    { id_coa: 10, tipe: 1, amount: 100 },
    { id_coa: 30, tipe: 0, amount: 100 },
  ]);
});

test("purchase journal matching does not depend on description", () => {
  assert.equal(
    isPurchaseJournalShape(
      [
        { tipe: 1, id_coa: 10, amount: 758000, coa: "Persediaan" },
        { tipe: 0, id_coa: 20, amount: 758000, coa: "Mandiri Belga" },
      ],
      758000,
    ),
    true,
  );
});

test("linked purchase journal remains identifiable after initial payment is split", () => {
  assert.equal(
    isPurchaseJournalShape(
      [
        { tipe: 1, id_coa: 10, amount: 758000, coa: "Persediaan" },
        { tipe: 0, id_coa: 20, amount: 500000, coa: "Mandiri Belga" },
        { tipe: 0, id_coa: 30, amount: 258000, coa: "Hutang" },
      ],
      758000,
    ),
    true,
  );
});

test("recovery candidate query does not filter by journal description", async () => {
  let query;
  let values;
  const expected = [{ id_jurnal: 42, keterangan: "Manual journal" }];
  const rows = await getCompatiblePurchaseJournals(
    {
      async execute(sql, params) {
        query = sql;
        values = params;
        return [expected];
      },
    },
    { entryId: 391, companyId: 1, total: 758000 },
  );

  assert.equal(rows, expected);
  assert.doesNotMatch(query, /j\.keterangan\s*=/);
  assert.match(query, /j\.id_perusahaan = \?/);
  assert.match(query, /c\.nama = 'Persediaan'/);
  assert.match(query, /COUNT\(t\.id\) BETWEEN 2 AND 3/);
  assert.deepEqual(values, [1, 391, 758000, 758000]);
});

test("purchase journal matching rejects a different amount or inventory account", () => {
  assert.equal(
    isPurchaseJournalShape(
      [
        { tipe: 1, id_coa: 10, amount: 758000, coa: "Persediaan" },
        { tipe: 0, id_coa: 20, amount: 750000, coa: "Mandiri Belga" },
      ],
      758000,
    ),
    false,
  );
  assert.equal(
    isPurchaseJournalShape(
      [
        { tipe: 1, id_coa: 10, amount: 758000, coa: "Kas" },
        { tipe: 0, id_coa: 20, amount: 758000, coa: "Mandiri Belga" },
      ],
      758000,
    ),
    false,
  );
  assert.equal(
    isPurchaseJournalShape(
      [
        { tipe: 1, id_coa: 10, amount: 758000, coa: "Persediaan" },
        { tipe: 0, id_coa: 10, amount: 758000, coa: "Persediaan" },
      ],
      758000,
    ),
    false,
  );
});
