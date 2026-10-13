import test from "node:test";
import assert from "node:assert/strict";
import { excludeZeroAmountLines } from "./produkmasuk-pembayaran.repository.js";

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
