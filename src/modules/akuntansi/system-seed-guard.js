const isSystemDefault = (row) =>
  String(row?.keterangan || "").trim().toLowerCase() === "system default";

export const isSystemGeneratedRecord = (row) =>
  Boolean(row?.system_key) ||
  Boolean(row?.system_form_linked) ||
  isSystemDefault(row);

export const assertNotSystemGenerated = (row, entity) => {
  if (isSystemGeneratedRecord(row)) {
    throw new Error(
      `${entity}${row?.nama ? ` ${row.nama}` : ""} bawaan sistem tidak dapat diubah atau dihapus.`,
    );
  }
};
