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
  from,
  to,
  aggregate,
  customWhere = "",
  customVal = [],
  buildCustomJoin = () => "",
  columnName,
}) => {
  const sql = `
      SELECT COUNT(main.${columnName}) totalRow, COALESCE(${aggregate}(main.${columnName}), 0) totalValue FROM ${table} main
      ${buildCustomJoin("main")}
      where 1=1
      ${queryWhereBuilder(from, "main.tanggal", ">=")}
      ${queryWhereBuilder(to, "main.tanggal", "<")}
      ${customWhere}
      `;
  const [rows] = await conn.execute(sql, [
    ...conditionalArrayBuilder(from),
    ...conditionalArrayBuilder(to),
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
  from,
  to,
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
  const values = [from, to, ...conditionalArrayBuilder(idPerusahaan)];
  console.log(values);
  const [rows] = await db.execute(sql, values);
  return rows;
};

export const patch = async (id, table, allowedFields, data) => {
  const fields = [];
  const values = [];
  for (const key of Object.keys(data)) {
    if (allowedFields.includes(key) && key !== "id") {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }
  if (fields.length === 0) {
    throw new Error("No fields to update");
  }
  const sql = `
      UPDATE ${table}
      SET ${fields.join(", ")}
      WHERE id = ?
    `;
  values.push(id);
  const [result] = await db.execute(sql, values);
  if (result.affectedRows === 0) {
    throw new Error("Record not found");
  }
  return result;
};
