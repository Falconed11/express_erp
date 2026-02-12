import db from "../config/db.js";

export const calculate = async ({
  table,
  start,
  end,
  aggregate,
  customWhere = "",
  customVal = [],
  columnName,
}) => {
  const sql = `
      SELECT COUNT(${columnName}) totalRow, COALESCE(${aggregate}(${columnName}), 0) totalValue FROM ${table}
      where 1=1
      AND tanggal >= ?
      AND tanggal < ?
      ${customWhere}
      `;
  const [rows] = await db.execute(sql, [start, end, ...customVal]);
  return rows[0];
};

export const getAll = async (table) => {
  const sql = `select * from ${table}`;
  const [rows] = await db.execute(sql);
  return rows;
};
