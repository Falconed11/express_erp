const SYSTEM_COA_TYPES = new Set([
  "Aktiva Lancar",
  "Biaya Operasional",
  "HPP",
  "Pendapatan",
]);

const SYSTEM_COA_SUBTYPES = new Set([
  "Kas|Aktiva Lancar",
  "Operasional Kantor|Biaya Operasional",
  "HPP|HPP",
  "Bank|Aktiva Lancar",
  "Pendapatan|Pendapatan",
]);

const SYSTEM_COAS = new Set(["HPP|HPP|HPP", "Pendapatan|Pendapatan|Pendapatan"]);

export const isSystemSeededCoa = (entity, row) => {
  if (!row?.nama) return false;

  if (entity === "coa_type") {
    return SYSTEM_COA_TYPES.has(row.nama);
  }

  if (entity === "coa_subtype") {
    return SYSTEM_COA_SUBTYPES.has(`${row.nama}|${row.coa_type}`);
  }

  if (entity === "coa") {
    return SYSTEM_COAS.has(
      `${row.nama}|${row.coa_subtype}|${row.coa_type}`,
    );
  }

  return false;
};

export const assertNotSystemSeededCoa = (entity, row) => {
  if (isSystemSeededCoa(entity, row)) {
    throw new Error(
      `Data ${row.nama} bawaan sistem tidak dapat diubah atau dihapus.`,
    );
  }
};
