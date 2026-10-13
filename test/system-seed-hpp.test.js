import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSeedService = () =>
  readFileSync(
    new URL(
      "../src/modules/system-seed/system-seed.service.js",
      import.meta.url,
    ),
    "utf8",
  );

test("HPP system seed uses debit normal balance", () => {
  const source = readSeedService();

  assert.match(
    source,
    /const hppType = await syncByName\(trx, "coa_type", "HPP", \{\s*normal_balance: 1,\s*aktif: true,/s,
    "HPP type should use normal_balance = 1 (debit).",
  );

  assert.match(
    source,
    /if \(type && type.normal_balance !== 1\)\s*details.push\("HPP COA type has the wrong normal balance\."\);/s,
    "Seed validation should expect HPP normal_balance = 1.",
  );
});
