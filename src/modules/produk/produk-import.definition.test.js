import test from "node:test";
import assert from "node:assert/strict";
import { parseNumber, produkImportDefinition } from "./produk-import.definition.js";

test("Produk import normalizes whitespace", () => {
  assert.equal(produkImportDefinition.columns.includes("satuan"), true);
  assert.equal(produkImportDefinition.columns.includes("hargajual"), true);
  assert.equal(produkImportDefinition.columns.includes("hargabatas"), true);
  const row = produkImportDefinition.normalize({
    produk: "  Apple   Phone ",
    kategori: "  Smartphone ",
    merek: " Apple   Indonesia ",
    tipe: " A-001 ",
    satuan: "  unit   pcs ",
    hargamodal: "10.000,50",
    hargajual: "12.000,00",
    hargabatas: "11.500,00",
  });
  assert.equal(row.produk, "Apple Phone");
  assert.equal(row.merek, "Apple Indonesia");
  assert.equal(row.satuan, "unit pcs");
  assert.equal(row.hargamodal, 10000.5);
  assert.equal(row.hargajual, 12000);
  assert.equal(row.hargabatas, 11500);
  assert.equal(
    produkImportDefinition.normalize({}).hargajual,
    null,
  );
});

test("Produk import reports duplicate tipe and invalid prices", () => {
  const rows = [
    { rowNumber: 2, produk: "A", kategori: "K", merek: "M", tipe: "SKU-1", satuan: "unit", hargamodal: 10, hargajual: null, hargabatas: null },
    { rowNumber: 3, produk: "B", kategori: "K", merek: "M", tipe: "SKU-1", satuan: "", hargamodal: null, hargajual: -1, hargabatas: null },
  ];
  const errors = produkImportDefinition.validate(rows, { tanggal: "2026-09-17", id_vendor: 1 });
  assert.equal(errors.filter((error) => error.code === "DUPLICATE_TIPE").length, 2);
  assert.equal(errors.some((error) => error.code === "INVALID_NUMBER"), true);
  assert.equal(errors.some((error) => error.field === "hargajual" && error.code === "INVALID_NUMBER"), true);
  assert.equal(errors.some((error) => error.field === "satuan" && error.code === "EMPTY_REQUIRED_FIELD"), true);
});

test("Produk import parses plain numeric values", () => {
  assert.equal(parseNumber(1000), 1000);
  assert.equal(parseNumber("1,250.75"), 1250.75);
  assert.equal(parseNumber("not a number"), null);
});
