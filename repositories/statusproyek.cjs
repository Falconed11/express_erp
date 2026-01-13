const { pool } = require("./db.2.0.0.cjs");
const table = "statusproyek";

const list = async ({ ids, nids, limit, offset }) => {
  const string2Array = (val) => (Array.isArray(val) ? val : [val]);
  const isPagination = limit != null && offset != null;
  if (ids) ids = string2Array(ids);
  if (nids) nids = string2Array(nids);
  let placeholders = "";
  if (ids) {
    placeholders += ` AND s.id IN (${ids.map(() => "?").join(",")})`;
  }
  if (nids) {
    placeholders += ` AND s.id NOT IN (${nids.map(() => "?").join(",")})`;
  }
  const sql = `
    SELECT s.id, s.nama, s.progress, COUNT(p.id) AS nproyek, COUNT(*) OVER () AS nstatusproyek
    FROM ${table} s
    LEFT JOIN proyek p ON p.id_statusproyek = s.id
    WHERE 1=1
      ${placeholders}
    GROUP BY s.id, s.nama, s.progress
    ORDER BY s.progress, s.nama
    ${isPagination ? "LIMIT ?, ?" : ""}
  `;
  const values = [
    ...(ids ?? []),
    ...(nids ?? []),
    ...(isPagination ? [offset, limit] : []),
  ];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({ nama, progress = 0 }) => {
  console.log(progress);
  if (!nama) throw new Error("Nama wajib diisi!");
  const sql = `insert into ${table} (nama,progress) values (?,?)`;
  const values = [nama, progress || 0];
  const [result] = await pool.execute(sql, values);
  return result.insertId;
};
const update = async ({ id, ...rest }) => {
  if (id == null) throw new Error("Id tidak valid");
  const allowedFields = ["nama", "progress"];
  const fields = [],
    values = [];
  for (const [key, value] of Object.entries(rest)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key}=?`);
      values.push(value);
    }
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  const [result] = await pool.execute(sql, values);
  return result;
};
const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id =?`;
  const values = [id];
  const [result] = await pool.execute(sql, values);
  return result;
};

module.exports = { list, create, update, destroy };
