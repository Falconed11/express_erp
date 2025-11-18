const { pool } = require("./db.2.0.0.cjs");
const table = "statusproyek";

const list = async ({ ids, nids }) => {
  const string2Array = (val) => (Array.isArray(val) ? val : [val]);
  if (ids) ids = string2Array(ids);
  if (nids) nids = string2Array(nids);
  let placeholders = ids
    ? " and s.id in(" + ids.map(() => "?").join(",") + ")"
    : "";
  placeholders += nids
    ? " and s.id not in(" + nids.map(() => "?").join(",") + ")"
    : "";
  const sql = `Select s.*, count(p.id) nproyek From ${table} s
  left join proyek p on p.id_statusproyek=s.id
  where 1=1${placeholders}
  group by s.id
  `;
  console.log(sql);
  const values = [...(ids ? ids : []), ...(nids ? nids : [])];
  const [rows] = await pool.execute(sql, values);
  return rows;
};
const create = async ({ nama, progress = 0 }) => {
  if (!nama) throw new Error("Nama wajib diisi!");
  const sql = `insert into ${table} (nama,progress) values (?,?)`;
  const values = [nama, progress];
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
