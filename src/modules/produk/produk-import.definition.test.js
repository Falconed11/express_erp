import test from "node:test";
import assert from "node:assert/strict";
import {
  parseNumber,
  produkImportDefinition,
} from "./produk-import.definition.js";

test("Produk import normalizes whitespace", () => {
  assert.equal(produkImportDefinition.columns.includes("satuan"), true);
  assert.equal(produkImportDefinition.columns.includes("hargamodal"), true);
  assert.equal(
    produkImportDefinition.optionalColumns.includes("hargajual"),
    true,
  );
  assert.equal(
    produkImportDefinition.optionalColumns.includes("hargabatas"),
    true,
  );
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
  assert.equal(row.hargajual_provided, true);
  assert.equal(row.hargabatas_provided, true);
});

test("Produk import reports duplicate tipe and invalid modal prices", () => {
  const rows = [
    {
      rowNumber: 2,
      produk: "A",
      kategori: "K",
      merek: "M",
      tipe: "SKU-1",
      satuan: "unit",
      hargamodal: 10,
      hargajual: null,
      hargabatas: null,
    },
    {
      rowNumber: 3,
      produk: "B",
      kategori: "K",
      merek: "M",
      tipe: "SKU-1",
      satuan: "",
      hargamodal: null,
      hargajual: -1,
      hargabatas: null,
    },
  ];
  const errors = produkImportDefinition.validate(rows, {
    tanggal: "2026-09-17",
    id_vendor: 1,
  });
  assert.equal(
    errors.filter((error) => error.code === "DUPLICATE_TIPE").length,
    2,
  );
  assert.equal(
    errors.some((error) => error.code === "INVALID_NUMBER"),
    true,
  );
  assert.equal(
    errors.some(
      (error) => error.field === "hargajual" && error.code === "INVALID_NUMBER",
    ),
    false,
  );
  assert.equal(
    errors.some(
      (error) =>
        error.field === "satuan" && error.code === "EMPTY_REQUIRED_FIELD",
    ),
    true,
  );
});

test("Produk import parses plain numeric values", () => {
  assert.equal(parseNumber(1000), 1000);
  assert.equal(parseNumber("1,250.75"), 1250.75);
  assert.equal(parseNumber("not a number"), null);
});

test("Produk import leaves optional prices unset when blank", () => {
  const row = produkImportDefinition.normalize({
    produk: "A",
    kategori: "K",
    merek: "M",
    tipe: "SKU-A",
    satuan: "unit",
    hargamodal: "100",
    hargajual: "",
    hargabatas: "",
  });
  assert.equal(row.hargajual, null);
  assert.equal(row.hargabatas, null);
  assert.equal(row.hargajual_provided, false);
  assert.equal(row.hargabatas_provided, false);
});

test("Produk import rejects invalid explicit prices", () => {
  const row = {
    rowNumber: 2,
    produk: "A",
    kategori: "K",
    merek: "M",
    tipe: "SKU-A",
    satuan: "unit",
    hargamodal: 100,
    hargajual: -1,
    hargabatas: null,
    hargajual_provided: true,
    hargabatas_provided: false,
  };
  const errors = produkImportDefinition.validate([row], {
    tanggal: "2026-10-19",
    id_vendor: 1,
  });
  assert.equal(
    errors.some((error) => error.field === "hargajual"),
    true,
  );
});
