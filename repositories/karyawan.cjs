const { pool } = require("./db.2.0.0.cjs");

const table = "karyawan";

const list = async ({ id, id_statuskaryawan }) => {
  const sql = `Select sk.status statuskaryawan, k.* From ${table} k 
  left join statuskaryawan sk on sk.id=k.id_statuskaryawan 
  where 1=1 ${id ? " and id=? " : ""}${
    id_statuskaryawan == 1 ? " and k.id_statuskaryawan=1 " : ""
  }
  order by nama`;
  const values = [id ?? null];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({ nama, id_statuskaryawan }) => {
  const sql = `insert into ${table} (nama, id_statuskaryawan) values (?,?)`;
  const values = [nama, id_statuskaryawan];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const update = async ({ id, nama, id_statuskaryawan }) => {
  const fields = [];
  const values = [];
  const isExist = (v) => v != null;
  if (isExist(nama)) {
    fields.push("nama=?");
    values.push(nama);
  }
  if (isExist(id_statuskaryawan)) {
    fields.push("id_statuskaryawan=?");
    values.push(id_statuskaryawan);
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy };
