import db from "../config/db.js";
import {
  conditionalArrayBuilder,
  queryWhereBuilder,
  qWhereIdPerusahaan,
} from "../utils/tools.js";

const mainTableAlias = "main";

export const calculate = async ({
  conn = db,
  table,
  start,
  end,
  aggregate,
  customWhere = "",
  customVal = [],
  buildCustomJoin = () => "",
  columnName,
}) => {
  console.log({ start, end });
  const sql = `
      SELECT COUNT(main.${columnName}) totalRow, COALESCE(${aggregate}(main.${columnName}), 0) totalValue FROM ${table} main
      ${buildCustomJoin("main")}
      where 1=1
      ${queryWhereBuilder(start, "main.tanggal", ">=")}
      ${queryWhereBuilder(end, "main.tanggal", "<")}
      ${customWhere}
      `;
  const [rows] = await conn.execute(sql, [
    ...conditionalArrayBuilder(start),
    ...conditionalArrayBuilder(end),
    ...customVal,
  ]);
  return rows[0];
};

export const getAll = async (table) => {
  const sql = `select * from ${table}`;
  const [rows] = await db.execute(sql);
  return rows;
};

export const getByPeriode = async (
  table,
  start,
  end,
  idPerusahaan,
  buildLeftJoin = () => "",
  select = "",
) => {
  const sql = `
      SELECT ${mainTableAlias}.*${select ? `, ${select}` : ""} FROM ${table} ${mainTableAlias}
      ${buildLeftJoin(mainTableAlias)}
      where 1=1
      AND ${mainTableAlias}.tanggal >= ?
      AND ${mainTableAlias}.tanggal < ?
      ${qWhereIdPerusahaan(idPerusahaan)}
      `;
  const [rows] = await db.execute(sql, [
    start,
    end,
    ...conditionalArrayBuilder(idPerusahaan),
  ]);
  return rows;
};
