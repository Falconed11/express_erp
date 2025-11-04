const { pool } = require("./db.2.0.0.cjs");

const table = "statustodolist";

const list = async ({ id }) => {
  const sql = `select * from ${table} where 1=1${id ? " and id=?" : ""}`;
  const values = [...(id ? [id] : [])];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const error = new Error("Status wajib diisi!");

/**
 * @returns {Promise<number>}
 */
const insertStatusTodoList = async ({ status, keterangan = "" }) => {
  if (!status) throw error;
  const sql = `insert into ${table} (status, keterangan) values (?,?)`;
  const values = [status, keterangan];
  const [rows] = await pool.execute(sql, values);
  return rows.insertId;
};

const create = async (rest) => {
  try {
    const res = await insertStatusTodoList(rest);
    console.log("Data created successfuly.");
    return res;
  } catch (err) {
    console.error("Error : ", err);
    return err;
  }
};

const update = async ({ id, ...rest }) => {
  if (id == null) throw new Error("Id tidak valid");
  const allowedFields = ["status", "keterangan"];
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
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, insertStatusTodoList, update, destroy };
