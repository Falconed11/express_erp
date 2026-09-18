import db from "../../config/knex.js";
import { createImportError, normalizeText } from "../imports/import-engine.js";

const INPUT_CODE_PREFIX = "IMPORT-PRODUK";
const BATCH_SIZE = 200;

export const parseNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = normalizeText(value);
  if (!raw) return null;
  const normalized = raw.includes(",") && raw.includes(".")
    ? raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "")
    : raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const addError = (errors, row, field, code, message) =>
  errors.push(createImportError(row.rowNumber, field, code, message));

const chunk = (items, size = BATCH_SIZE) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

const findByNames = async (connection, table, names) => {
  if (!names.length) return [];
  const rows = [];
  for (const group of chunk(names)) {
    rows.push(...(await connection(table).select("id", "nama").whereIn("nama", group)));
  }
  return rows;
};

const resolveDependencies = async (connection, table, names, inputcode) => {
  const uniqueNames = [...new Set(names)];
  const current = await findByNames(connection, table, uniqueNames);
  const existingNames = new Set(current.map((row) => row.nama));
  const missing = uniqueNames.filter((name) => !existingNames.has(name));
  if (missing.length) {
    for (const group of chunk(missing)) {
      await connection(table).insert(group.map((nama) => ({ nama, inputcode })));
    }
  }
  return findByNames(connection, table, uniqueNames);
};

const createPreview = async (rows, errors, context) => {
  const invalidRows = new Set(errors.map((error) => error.row));
  const validRows = rows.filter((row) => !invalidRows.has(row.rowNumber));
  const [vendor] = await db("vendor").select("id").where("id", context.id_vendor).limit(1);
  if (!vendor) {
    errors.push(createImportError(null, "id_vendor", "INVALID_VENDOR", "Vendor tidak ditemukan."));
  }

  const categories = [...new Set(validRows.map((row) => row.kategori))];
  const brands = [...new Set(validRows.map((row) => row.merek))];
  const types = [...new Set(validRows.map((row) => row.tipe))];
  const [existingCategories, existingBrands, existingProducts] = await Promise.all([
    findByNames(db, "kategoriproduk", categories),
    findByNames(db, "merek", brands),
    types.length ? db("produk").select("id", "tipe").whereIn("tipe", types) : [],
  ]);
  const categorySet = new Set(existingCategories.map((row) => row.nama));
  const brandSet = new Set(existingBrands.map((row) => row.nama));
  const productSet = new Set(existingProducts.map((row) => row.tipe));
  const finalInvalidRows = new Set(errors.map((error) => error.row).filter(Boolean));
  const hasGlobalError = errors.some((error) => !error.row);
  const finalValidRows = hasGlobalError
    ? []
    : rows.filter((row) => !finalInvalidRows.has(row.rowNumber));

  return {
    totalRows: rows.length,
    validRows: finalValidRows.length,
    invalidRows: rows.length - finalValidRows.length,
    newProducts: finalValidRows.filter((row) => !productSet.has(row.tipe)).length,
    updateProducts: finalValidRows.filter((row) => productSet.has(row.tipe)).length,
    newCategories: categories.filter((name) => !categorySet.has(name)).length,
    newBrands: brands.filter((name) => !brandSet.has(name)).length,
    rows: rows.map((row) => ({
      row: row.rowNumber,
      tipe: row.tipe,
      status: finalInvalidRows.has(row.rowNumber)
        ? "ERROR"
        : productSet.has(row.tipe)
          ? "UPDATE"
          : "CREATE",
    })),
  };
};

const commitProduk = async (job, actor) => {
  const inputcode = `${INPUT_CODE_PREFIX}-${job.id}`;
  return db.transaction(async (trx) => {
    const rows = job.rows;
    const [categories, brands] = await Promise.all([
      resolveDependencies(trx, "kategoriproduk", rows.map((row) => row.kategori), inputcode),
      resolveDependencies(trx, "merek", rows.map((row) => row.merek), inputcode),
    ]);
    const categoryIds = new Map(categories.map((row) => [row.nama, row.id]));
    const brandIds = new Map(brands.map((row) => [row.nama, row.id]));
    const types = [...new Set(rows.map((row) => row.tipe))];
    const existing = await trx("produk").select("id", "tipe").whereIn("tipe", types);
    const existingByType = new Map(existing.map((row) => [row.tipe, row.id]));
    const newRows = rows.filter((row) => !existingByType.has(row.tipe));
    const updateRows = rows.filter((row) => existingByType.has(row.tipe));

    if (newRows.length) {
      for (const group of chunk(newRows)) {
        await trx("produk").insert(
          group.map((row) => ({
            id_kustom: row.tipe,
            nama: row.produk,
            id_kategori: categoryIds.get(row.kategori),
            id_merek: brandIds.get(row.merek),
            tipe: row.tipe,
            hargamodal: row.hargamodal,
            hargajual: 0,
            tanggal: job.context.tanggal,
            satuan: row.satuan,
            keterangan: "",
            manualinput: 1,
            inputcode,
          })),
        );
      }
    }

    for (const group of chunk(updateRows)) {
      await Promise.all(
        group.map((row) =>
          trx("produk").where("id", existingByType.get(row.tipe)).update({
            nama: row.produk,
            id_kategori: categoryIds.get(row.kategori),
            id_merek: brandIds.get(row.merek),
            tipe: row.tipe,
            hargamodal: row.hargamodal,
            tanggal: job.context.tanggal,
            satuan: row.satuan,
            inputcode,
          }),
        ),
      );
    }

    const finalProducts = await trx("produk").select("id", "tipe").whereIn("tipe", types);
    const productIds = new Map(finalProducts.map((row) => [row.tipe, row.id]));
    const stockRows = rows.map((row) => ({
      id_produk: productIds.get(row.tipe),
      id_vendor: job.context.id_vendor,
      tanggal: job.context.tanggal,
      jumlah: 0,
      harga: row.hargamodal,
    }));
    for (const group of chunk(stockRows)) await trx("produkmasuk").insert(group);

    return {
      created: newRows.length,
      updated: updateRows.length,
      produkMasukCreated: stockRows.length,
      actorId: actor?.id_karyawan ?? null,
    };
  });
};

export const produkImportDefinition = {
  type: "products",
  columns: ["produk", "kategori", "merek", "tipe", "satuan", "hargamodal"],
  normalize(values) {
    return {
      produk: normalizeText(values.produk),
      kategori: normalizeText(values.kategori),
      merek: normalizeText(values.merek),
      tipe: normalizeText(values.tipe),
      satuan: normalizeText(values.satuan),
      hargamodal: parseNumber(values.hargamodal),
    };
  },
  validate(rows, context) {
    const errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(context.tanggal ?? ""))) {
      errors.push(createImportError(null, "tanggal", "INVALID_DATE", "Tanggal import tidak valid."));
    }
    if (!context.id_vendor) {
      errors.push(createImportError(null, "id_vendor", "INVALID_VENDOR", "Vendor wajib dipilih."));
    }
    const types = new Map();
    for (const row of rows) {
      for (const field of ["produk", "kategori", "merek", "tipe", "satuan"]) {
        if (!row[field]) addError(errors, row, field, "EMPTY_REQUIRED_FIELD", `${field} wajib diisi.`);
      }
      if (row.hargamodal === null || row.hargamodal < 0) {
        addError(errors, row, "hargamodal", "INVALID_NUMBER", "hargamodal harus berupa angka nol atau lebih.");
      }
      if (row.tipe) types.set(row.tipe, [...(types.get(row.tipe) ?? []), row]);
    }
    for (const [tipe, duplicates] of types) {
      if (duplicates.length > 1) {
        duplicates.forEach((row) =>
          addError(errors, row, "tipe", "DUPLICATE_TIPE", `tipe ${tipe} muncul lebih dari sekali.`),
        );
      }
    }
    return errors;
  },
  preview: createPreview,
  commit: commitProduk,
};
