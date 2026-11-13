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

test("product-loan seed uses complete COA names and upgrades legacy aliases", () => {
  const source = readSeedService();
  const accountNames = [
    "Piutang Antarperusahaan",
    "Hutang Antarperusahaan",
    "Keuntungan Selisih Pengembalian Pinjaman",
    "Kerugian Selisih Pengembalian Pinjaman",
  ];

  for (const name of accountNames) {
    assert.ok(name.length <= 64, `${name} exceeds the COA name limit.`);
    assert.ok(source.includes(`name: "${name}"`), `${name} is not seeded.`);
  }

  assert.match(source, /legacyNames = \[\]/);
  assert.match(source, /"Untung Selisih Pinjaman"/);
  assert.match(source, /"Rugi Selisih Pinjaman"/);
  assert.match(source, /"Keuntungan Selisih Penge"/);
  assert.match(source, /"Kerugian Selisih Pengemb"/);
  assert.match(source, /subtype: "Pendapatan Lain-lain"/);
  assert.match(source, /subtype: "Biaya Lain-lain"/);
  assert.match(
    source,
    /name: "Keuntungan Selisih Pengembalian Pinjaman",\s*subtype: "Pendapatan Lain-lain",\s*parent: pendapatanBiayaLainLainType\.id,/s,
  );
  assert.match(
    source,
    /name: "Kerugian Selisih Pengembalian Pinjaman",\s*subtype: "Biaya Lain-lain",\s*parent: pendapatanBiayaLainLainType\.id,/s,
  );
  assert.doesNotMatch(source, /"coa_type", "Pendapatan Lain-lain"/);
  assert.doesNotMatch(source, /"coa_type", "Biaya Lain-lain"/);
  assert.match(source, /"coa_type",\s*"Pendapatan Biaya Lain-lain"/);
  assert.match(source, /"Pendapatan Biaya Lain-la"/);
});
