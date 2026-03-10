export const conditionalArrayBuilder = (val) => (val ? [val] : []);

export const queryWhereBuilder = (val, column, operator = "=") =>
  val ? `and ${column}${operator}?` : "";

export const qWhereIdPerusahaan = (idPerusahaan) =>
  queryWhereBuilder(idPerusahaan, "id_perusahaan");

export const buildQueryCount = (aggregate, columnName, alias = "") =>
  `COALESCE(${aggregate}(${columnName}), 0) ${alias}`;
