const SYSTEM_COA_TYPES = new Set([
  "Aktiva Lancar",
  "Biaya Operasional",
  "HPP",
  "Pendapatan",
  "Kewajiban Lancar",
  "Ekuitas",
  "Pendapatan Biaya Lain-lain",
]);

const SYSTEM_COA_SUBTYPES = new Set([
  "Kas|Aktiva Lancar",
  "Operasional Kantor|Biaya Operasional",
  "HPP|HPP",
  "Bank|Aktiva Lancar",
  "Pendapatan|Pendapatan",
  "Persediaan|Aktiva Lancar",
  "Hutang|Kewajiban Lancar",
  "Piutang Antarperusahaan|Aktiva Lancar",
  "Hutang Antarperusahaan|Kewajiban Lancar",
  "Untung Selisih Pinjaman|Pendapatan",
  "Rugi Selisih Pinjaman|Biaya Operasional",
  "Keuntungan Selisih Penge|Pendapatan",
  "Kerugian Selisih Pengemb|Biaya Operasional",
  "Keuntungan Selisih Pengembalian Pinjaman|Pendapatan",
  "Kerugian Selisih Pengembalian Pinjaman|Biaya Operasional",
  "Pendapatan Lain-lain|Pendapatan Biaya Lain-lain",
  "Biaya Lain-lain|Pendapatan Biaya Lain-lain",
  "Modal|Ekuitas",
]);

const SYSTEM_COAS = new Set([
  "HPP|HPP|HPP",
  "Pendapatan|Pendapatan|Pendapatan",
  "Persediaan|Persediaan|Aktiva Lancar",
  "Hutang|Hutang|Kewajiban Lancar",
  "Piutang Antarperusahaan|Piutang Antarperusahaan|Aktiva Lancar",
  "Hutang Antarperusahaan|Hutang Antarperusahaan|Kewajiban Lancar",
  "Untung Selisih Pinjaman|Untung Selisih Pinjaman|Pendapatan",
  "Rugi Selisih Pinjaman|Rugi Selisih Pinjaman|Biaya Operasional",
  "Keuntungan Selisih Penge|Keuntungan Selisih Penge|Pendapatan",
  "Kerugian Selisih Pengemb|Kerugian Selisih Pengemb|Biaya Operasional",
  "Keuntungan Selisih Pengembalian Pinjaman|Keuntungan Selisih Pengembalian Pinjaman|Pendapatan",
  "Kerugian Selisih Pengembalian Pinjaman|Kerugian Selisih Pengembalian Pinjaman|Biaya Operasional",
  "Keuntungan Selisih Pengembalian Pinjaman|Pendapatan Lain-lain|Pendapatan Biaya Lain-lain",
  "Kerugian Selisih Pengembalian Pinjaman|Biaya Lain-lain|Pendapatan Biaya Lain-lain",
  "Modal|Modal|Ekuitas",
]);

export const isSystemSeededCoa = (entity, row) => {
  if (!row?.nama) return false;

  if (entity === "coa_type") {
    return SYSTEM_COA_TYPES.has(row.nama);
  }

  if (entity === "coa_subtype") {
    return SYSTEM_COA_SUBTYPES.has(`${row.nama}|${row.coa_type}`);
  }

  if (entity === "coa") {
    return SYSTEM_COAS.has(`${row.nama}|${row.coa_subtype}|${row.coa_type}`);
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
