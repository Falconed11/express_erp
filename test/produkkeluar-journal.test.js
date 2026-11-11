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
    /INSERT INTO produkmasuk\s+\(id_produk, id_vendor, jumlah, harga, terbayar, tanggal, jatuhtempo,\s+pinjaman, id_perusahaan, jenis_transaksi,\s+id_produkmasuk_pinjaman_vendor\)\s+VALUES \(\?, \?, \?, \?, 0, \?, NULL, 0, \?, 'pembelian', \?\)/i,
    "The split borrower-company purchase should retain the source vendor-loan entry ID.",
  );
  assert.match(
    source,
    /createPurchaseJournal\(conn,\s*\{\s*id_produkmasuk: entryResult\.insertId,\s*id_perusahaan: id_perusahaan_peminjam,\s*id_coa_kredit: debtCoaId,[\s\S]*?lunas: false,/,
    "The split purchase should be journaled as Hutang for the borrower company.",
  );
});

test("deleting an unpaid vendor-loan production output restores its source stock", () => {
  const source = readRepo();
  const deleteBlock = source.slice(
    source.indexOf("async function _deleteInTransaction"),
    source.indexOf("module.exports"),
  );

  assert.match(
    deleteBlock,
    /id_produkmasuk_pinjaman_vendor/,
    "Deletion should identify purchase entries derived from vendor-loan stock.",
  );
  assert.match(
    deleteBlock,
    /Number\(stockEntry\.terbayar \|\| 0\) > 0\.001[\s\S]*?paymentLinks\.some/,
    "Deletion should reject entries with recorded payments or extra linked journals.",
  );
  assert.match(
    deleteBlock,
    /UPDATE produkmasuk SET keluar = keluar - \? WHERE id = \?[\s\S]*?vendorLoanSourceId/,
    "Deletion should restore the quantity to the original vendor-loan entry.",
  );
  assert.match(
    deleteBlock,
    /vendorLoanSourceId != null && vendorLoanSourceCompanyId != null[\s\S]*?vendorLoanSourceCompanyId/,
    "Deletion should restore company stock to the vendor-loan source company.",
  );
  assert.match(
    deleteBlock,
    /DELETE FROM produkmasuk_pembayaran WHERE id_produkmasuk = \?[\s\S]*?DELETE FROM transaksi WHERE id_jurnal = \?[\s\S]*?DELETE FROM jurnal WHERE id = \?[\s\S]*?DELETE FROM produkmasuk WHERE id = \?/,
    "Deletion should remove the generated purchase link, payable journal, and derived entry.",
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
