const { pool } = require("./db.2.0.0.cjs");

const table = "peran";

const list = async ({ id = "", peran = "", rank = "" }) => {
  let mod = "";
  console.log({ rank });
  if (rank) mod = ` and (rank>?)`;
  const sql = `select * from ${table} where 1=1${id ? " and id=?" : ""}${mod}`;
  const values = [...(id ? [id] : []), ...(rank ? [rank] : [])];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const error = new Error("Peran dan Rank wajib diisi!");

const create = async ({ peran, rank, keterangan = "" }) => {
  if (!peran || !rank) throw error;
  const sql = `insert into ${table} (peran, rank, keterangan) values (?,?,?)`;
  const values = [peran, rank, keterangan];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const update = async ({ id, peran, rank, keterangan }) => {
  if (!peran || !rank) throw error;
  const fields = [];
  const values = [];
  const isExist = (v) => v != null;
  if (isExist(peran)) {
    fields.push("peran=?");
    values.push(peran);
  }
  if (isExist(rank)) {
    fields.push("rank=?");
    values.push(rank);
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
