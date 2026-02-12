export const conditionalArrayBuilder = (val) => (val ? [val] : []);

export const queryWhereBuilder = (val, column) =>
  val ? `and ${column}=?` : "";

export const qWhereIdPerusahaan = (idPerusahaan) =>
  queryWhereBuilder(idPerusahaan, "id_perusahaan");
