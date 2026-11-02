const { pool } = require("./db.2.0.0.cjs");
const { assertOfferEditable } = require("../src/modules/project-approval/project-approval-invalidation.cjs");

const table = "proyek_keteranganpenawaran";

const list = async ({ id }) => {
  const sql = `select * from ${table}${id ? " where id =?" : ""}`;
  const values = [];
  if (id) values.push(id);
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({ idProyek, idKeteranganPenawaran }) => {
  await assertOfferEditable(pool, idProyek);
  const sql = `insert into ${table} (id_proyek, id_KeteranganPenawaran) values (?,?)`;
  const values = [idProyek, idKeteranganPenawaran];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const update = async ({ keterangan, id }) => {
  const [projectRows] = await pool.execute(
    `SELECT id_proyek FROM ${table} WHERE id = ?`,
    [id],
  );
  for (const row of projectRows) {
    await assertOfferEditable(pool, row.id_proyek);
  }
  const sql = `update ${table} set keterangan=? where id =?`;
  const values = [keterangan, id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const destroy = async ({ idProyek, idKeteranganPenawaran }) => {
  await assertOfferEditable(pool, idProyek);
  const sql = `delete from ${table} where id_proyek=? and id_keteranganpenawaran=?`;
  const values = [idProyek, idKeteranganPenawaran];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy };
