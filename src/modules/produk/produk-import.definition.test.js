import test from "node:test";
import assert from "node:assert/strict";
import { parseNumber, produkImportDefinition } from "./produk-import.definition.js";

test("Produk import normalizes whitespace", () => {
  const row = produkImportDefinition.normalize({
    produk: "  Apple   Phone ",
    kategori: "  Smartphone ",
    merek: " Apple   Indonesia ",
    tipe: " A-001 ",
    hargamodal: "10.000,50",
  });
  assert.equal(row.produk, "Apple Phone");
  assert.equal(row.merek, "Apple Indonesia");
  assert.equal(row.hargamodal, 10000.5);
});

test("Produk import reports duplicate tipe and invalid prices", () => {
  const rows = [
    { rowNumber: 2, produk: "A", kategori: "K", merek: "M", tipe: "SKU-1", hargamodal: 10 },
    { rowNumber: 3, produk: "B", kategori: "K", merek: "M", tipe: "SKU-1", hargamodal: null },
  ];
  const errors = produkImportDefinition.validate(rows, { tanggal: "2026-09-17", id_vendor: 1 });
  assert.equal(errors.filter((error) => error.code === "DUPLICATE_TIPE").length, 2);
  assert.equal(errors.some((error) => error.code === "INVALID_NUMBER"), true);
});

test("Produk import parses plain numeric values", () => {
  assert.equal(parseNumber(1000), 1000);
  assert.equal(parseNumber("1,250.75"), 1250.75);
  assert.equal(parseNumber("not a number"), null);
});
