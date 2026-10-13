import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readRepo = () =>
  readFileSync(
    new URL("../repositories/produkkeluar.cjs", import.meta.url),
    "utf8",
  );

test("stock output creates HPP journal with Persediaan counterpart", () => {
  const source = readRepo();

  assert.match(
    source,
    /SELECT id FROM jurnal_form WHERE system_key = 'HPP' AND aktif = 1 LIMIT 1/i,
    "Stock journal creation should resolve the HPP journal form.",
  );

  assert.match(
    source,
    /cs\.nama = 'Persediaan'|c\.nama = 'Persediaan'/i,
    "Stock journal creation should resolve the Persediaan COA.",
  );

  assert.match(
    source,
    /INSERT INTO transaksi\s*\(\s*id_jurnal,\s*id_coa,\s*tipe,\s*amount,\s*keterangan,\s*created_by,\s*updated_by\s*\)\s*VALUES\s*\(\?\s*,\s*\?\s*,\s*1,\s*\?,\s*'HPP'|INSERT INTO transaksi\s*\(\s*id_jurnal,\s*id_coa,\s*tipe,\s*amount,\s*keterangan,\s*created_by,\s*updated_by\s*\)\s*VALUES\s*\(\?\s*,\s*\?\s*,\s*1,\s*\?,\s*'HPP'|HPP'\s*,\s*\?\s*,\s*\?\s*\)/is,
    "Stock journal transactions should include the HPP debit entry.",
  );
});

test("standalone Pinjaman stock is split into a borrower-owned Hutang purchase", () => {
  const source = readRepo();

  assert.match(
    source,
    /Number\(pm\.pinjaman\) === 1 && pm\.id_produkpinjaman == null/,
    "Only Pinjaman-marked stock without an existing intercompany loan is converted.",
  );
  assert.match(
    source,
    /INSERT INTO produkmasuk\s+\(id_produk, id_vendor, jumlah, harga, terbayar, tanggal, jatuhtempo,\s+pinjaman, id_perusahaan, created_by, updated_by, jenis_transaksi\)\s+VALUES \(\?, \?, \?, \?, 0, \?, NULL, 0, \?, \?, \?, 'pembelian'\)/i,
    "The used quantity should be split into a borrower-company purchase entry.",
  );
  assert.match(
    source,
    /createPurchaseJournal\(conn,\s*\{\s*id_produkmasuk: entryResult\.insertId,\s*id_perusahaan: id_perusahaan_peminjam,\s*id_coa_kredit: debtCoaId,[\s\S]*?lunas: false,/,
    "The split purchase should be journaled as Hutang for the borrower company.",
  );
});

test("deleting one stock output preserves and recalculates its shared HPP journal", () => {
  const source = readRepo();
  const destroyBlock = source.slice(
    source.indexOf("async function destroy(params)"),
    source.indexOf("async function destroyByJurnalInTransaction"),
  );

  assert.match(
    destroyBlock,
    /if \(params\.id != null\) \{\s*return _deleteInTransaction\(\{ \.\.\.params, conn \}\);\s*\}\s*if \(params\.id_jurnal\)/,
    "A selected output ID should take precedence over journal-wide deletion.",
  );

  assert.match(
    source,
    /WHERE id_jurnal = \? AND id <> \?/,
    "Journal recalculation should exclude only the selected stock output.",
  );
  assert.match(
    source,
    /UPDATE transaksi\s+SET amount = \?\s+WHERE id_jurnal = \? AND keterangan IN \('HPP', 'Persediaan'\)/,
    "The remaining HPP and Persediaan transactions should be recalculated.",
  );
});
