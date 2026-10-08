import db from "../../config/knex.js";
import { createImportError, normalizeText } from "../imports/import-engine.js";

const INPUT_CODE_PREFIX = "IMPORT-PRODUK";
const BATCH_SIZE = 200;

export const parseNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = normalizeText(value);
  if (!raw) return null;
  const normalized =
    raw.includes(",") && raw.includes(".")
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
    rows.push(
      ...(await connection(table).select("id", "nama").whereIn("nama", group)),
    );
  }
  return rows;
};

const resolveDependencies = async (
  connection,
  table,
  rows,
  field,
  inputcode,
) => {
  // Deduplicate using lowercase keys while keeping the first-seen original string casing for insertions
  const uniqueNamesMap = new Map();
  for (const row of rows) {
    const original = row[field];
    if (original) {
      const lower = original.toLowerCase();
      if (!uniqueNamesMap.has(lower)) {
        uniqueNamesMap.set(lower, original);
      }
    }
  }

  const searchNames = Array.from(uniqueNamesMap.values());
  const current = await findByNames(connection, table, searchNames);

  // Track existing records in lowercase
  const existingNamesLower = new Set(current.map((r) => r.nama.toLowerCase()));

  // Find missing entries based on lowercased names
  const missingOriginals = searchNames.filter(
    (name) => !existingNamesLower.has(name.toLowerCase()),
  );

  if (missingOriginals.length) {
    for (const group of chunk(missingOriginals)) {
      await connection(table).insert(
        group.map((nama) => ({ nama, inputcode })),
      );
    }
  }

  // Re-fetch all names so we have IDs for newly created + existing entries
  return findByNames(connection, table, searchNames);
};

const createPreview = async (rows, errors, context) => {
  const invalidRows = new Set(errors.map((error) => error.row));
  const validRows = rows.filter((row) => !invalidRows.has(row.rowNumber));
  const [vendor] = await db("vendor")
    .select("id")
    .where("id", context.id_vendor)
    .limit(1);
  if (!vendor) {
    errors.push(
      createImportError(
        null,
        "id_vendor",
        "INVALID_VENDOR",
        "Vendor tidak ditemukan.",
      ),
    );
  }

  // Deduplicate array values while maintaining a clean lookup list
  const categories = [...new Set(validRows.map((row) => row.kategori))];
  const brands = [...new Set(validRows.map((row) => row.merek))];
  const types = [...new Set(validRows.map((row) => row.tipe))];

  const [existingCategories, existingBrands, existingProducts] =
    await Promise.all([
      findByNames(db, "kategoriproduk", categories),
      findByNames(db, "merek", brands),
      types.length
        ? db("produk").select("id", "tipe").whereIn("tipe", types)
        : [],
    ]);

  // Use lowercased keys for Sets to handle case-insensitive matching
  const categorySet = new Set(
    existingCategories.map((row) => row.nama.toLowerCase()),
  );
  const brandSet = new Set(existingBrands.map((row) => row.nama.toLowerCase()));
  const productSet = new Set(
    existingProducts.map((row) => row.tipe.toLowerCase()),
  );

  const finalInvalidRows = new Set(
    errors.map((error) => error.row).filter(Boolean),
  );
  const hasGlobalError = errors.some((error) => !error.row);
  const finalValidRows = hasGlobalError
    ? []
    : rows.filter((row) => !finalInvalidRows.has(row.rowNumber));

  // Count distinct missing entities case-insensitively
  const uniqueValidCategoriesLower = new Set(
    finalValidRows.map((r) => r.kategori.toLowerCase()),
  );
  const uniqueValidBrandsLower = new Set(
    finalValidRows.map((r) => r.merek.toLowerCase()),
  );

  let newCategoriesCount = 0;
  for (const cat of uniqueValidCategoriesLower) {
    if (!categorySet.has(cat)) newCategoriesCount++;
  }

  let newBrandsCount = 0;
  for (const brand of uniqueValidBrandsLower) {
    if (!brandSet.has(brand)) newBrandsCount++;
  }

  return {
    totalRows: rows.length,
    validRows: finalValidRows.length,
    invalidRows: rows.length - finalValidRows.length,
    newProducts: finalValidRows.filter(
      (row) => !productSet.has(row.tipe.toLowerCase()),
    ).length,
    updateProducts: finalValidRows.filter((row) =>
      productSet.has(row.tipe.toLowerCase()),
    ).length,
    newCategories: newCategoriesCount,
    newBrands: newBrandsCount,
    rows: rows.map((row) => ({
      row: row.rowNumber,
      tipe: row.tipe,
      status: finalInvalidRows.has(row.rowNumber)
        ? "ERROR"
        : productSet.has(row.tipe?.toLowerCase())
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
      resolveDependencies(trx, "kategoriproduk", rows, "kategori", inputcode),
      resolveDependencies(trx, "merek", rows, "merek", inputcode),
    ]);

    // Store maps with lowercased keys for safe case-insensitive lookup
    const categoryIds = new Map(
      categories.map((row) => [row.nama.toLowerCase(), row.id]),
    );
    const brandIds = new Map(
      brands.map((row) => [row.nama.toLowerCase(), row.id]),
    );

    const types = [...new Set(rows.map((row) => row.tipe))];
    const existing = await trx("produk")
      .select("id", "tipe")
      .whereIn("tipe", types);

    // Map existing products using lowercase key
    const existingByType = new Map(
      existing.map((row) => [row.tipe.toLowerCase(), row.id]),
    );

    const newRows = rows.filter(
      (row) => !existingByType.has(row.tipe.toLowerCase()),
    );
    const updateRows = rows.filter((row) =>
      existingByType.has(row.tipe.toLowerCase()),
    );

    if (newRows.length) {
      for (const group of chunk(newRows)) {
        await trx("produk").insert(
          group.map((row) => ({
            id_kustom: row.tipe,
            nama: row.produk, // Retains original input casing
            id_kategori: categoryIds.get(row.kategori.toLowerCase()),
            id_merek: brandIds.get(row.merek.toLowerCase()),
            tipe: row.tipe, // Retains original input casing
            hargamodal: row.hargamodal,
            hargajual: row.hargajual ?? 0,
            hargabatas: row.hargabatas,
            main_vendor: job.context.main_vendor ?? job.context.id_vendor,
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
          trx("produk")
            .where("id", existingByType.get(row.tipe.toLowerCase()))
            .update({
              nama: row.produk, // Updates with original input casing
              id_kategori: categoryIds.get(row.kategori.toLowerCase()),
              id_merek: brandIds.get(row.merek.toLowerCase()),
              tipe: row.tipe, // Updates with original input casing
              hargamodal: row.hargamodal,
              hargajual: row.hargajual ?? 0,
              hargabatas: row.hargabatas,
              main_vendor: job.context.main_vendor ?? job.context.id_vendor,
              tanggal: job.context.tanggal,
              satuan: row.satuan,
              inputcode,
            }),
        ),
      );
    }

    const finalProducts = await trx("produk")
      .select("id", "tipe")
      .whereIn("tipe", types);
    const productIds = new Map(
      finalProducts.map((row) => [row.tipe.toLowerCase(), row.id]),
    );

    const stockRows = rows.map((row) => ({
      id_produk: productIds.get(row.tipe.toLowerCase()),
      id_vendor: job.context.id_vendor,
      tanggal: job.context.tanggal,
      jumlah: 0,
      harga: row.hargamodal,
    }));

    for (const group of chunk(stockRows))
      await trx("produkmasuk").insert(group);

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
  columns: [
    "produk",
    "kategori",
    "merek",
    "tipe",
    "satuan",
    "hargamodal",
    "hargajual",
    "hargabatas",
  ],
  normalize(values) {
    return {
      produk: normalizeText(values.produk),
      kategori: normalizeText(values.kategori),
      merek: normalizeText(values.merek),
      tipe: normalizeText(values.tipe),
      satuan: normalizeText(values.satuan),
      hargamodal: parseNumber(values.hargamodal),
      hargajual: normalizeText(values.hargajual)
        ? parseNumber(values.hargajual)
        : null,
      hargabatas: normalizeText(values.hargabatas)
        ? parseNumber(values.hargabatas)
        : null,
    };
  },
  validate(rows, context) {
    const errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(context.tanggal ?? ""))) {
      errors.push(
        createImportError(
          null,
          "tanggal",
          "INVALID_DATE",
          "Tanggal import tidak valid.",
        ),
      );
    }
    if (!context.id_vendor) {
      errors.push(
        createImportError(
          null,
          "id_vendor",
          "INVALID_VENDOR",
          "Vendor wajib dipilih.",
        ),
      );
    }

    // Case-insensitive duplicate check within the import file
    const types = new Map();
    for (const row of rows) {
      for (const field of ["produk", "kategori", "merek", "tipe", "satuan"]) {
        if (!row[field])
          addError(
            errors,
            row,
            field,
            "EMPTY_REQUIRED_FIELD",
            `${field} wajib diisi.`,
          );
      }
      if (row.hargamodal === null || row.hargamodal < 0) {
        addError(
          errors,
          row,
          "hargamodal",
          "INVALID_NUMBER",
          "hargamodal harus berupa angka nol atau lebih.",
        );
      }
      for (const field of ["hargajual", "hargabatas"]) {
        if (
          row[field] != null &&
          (row[field] < 0 || !Number.isFinite(row[field]))
        ) {
          addError(
            errors,
            row,
            field,
            "INVALID_NUMBER",
            `${field} harus berupa angka nol atau lebih.`,
          );
        }
      }
      if (row.tipe) {
        const lowerTipe = row.tipe.toLowerCase();
        types.set(lowerTipe, [...(types.get(lowerTipe) ?? []), row]);
      }
    }

    for (const [, duplicates] of types) {
      if (duplicates.length > 1) {
        duplicates.forEach((row) =>
          addError(
            errors,
            row,
            "tipe",
            "DUPLICATE_TIPE",
            `tipe ${row.tipe} muncul lebih dari sekali.`,
          ),
        );
      }
    }
    return errors;
  },
  preview: createPreview,
  commit: commitProduk,
};
