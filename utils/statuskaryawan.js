const { pool } = require("./db.2.0.0");

const table = "statuskaryawan";

const list = async ({ id = "" }) => {
  const sql = `select * from ${table} where 1=1${id ? " and id=?" : ""}`;
  const values = [id ?? null];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({ status, keterangan = "" }) => {
  if (!status) throw new Error("Status wajib diisi!");
  const sql = `insert into ${table} (status, keterangan) values (?,?)`;
  const values = [status, keterangan];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const update = async ({ id, status, keterangan }) => {
  if (!status) throw new Error("Status wajib diisi!");
  const fields = [];
  const values = [];
  const isExist = (v) => v != null;
  if (isExist(status)) {
    fields.push("status=?");
    values.push(status);
  }
  if (isExist(keterangan)) {
    fields.push("keterangan=?");
    values.push(keterangan);
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id =?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy };
