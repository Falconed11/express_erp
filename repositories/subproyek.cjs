const connection = require("./db.cjs");
const { pool } = require("./db.2.0.0.cjs");
const { withTransaction } = require("../helpers/transaction.cjs");
const {
  assertOfferEditable,
} = require("../src/modules/project-approval/project-approval-invalidation.cjs");
const table = "subproyek";

const list = ({ id_proyek }) => {
  const sql = `Select * From ${table} where 1=1${
    id_proyek ? ` and id_proyek=?` : ""
  } order by coalesce(urutan, id), id;`;
  const val = [id_proyek];
  return new Promise((resolve, _reject) => {
    connection.query(sql, val, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ id_proyek, nama }) =>
  withTransaction(pool, async (conn) => {
    await assertOfferEditable(conn, id_proyek);
    const [rows] = await conn.execute(
      `select coalesce(max(urutan), -1) + 1 as nextOrder from ${table} where id_proyek = ?`,
      [id_proyek],
    );
    const sql = `insert into ${table} (id_proyek, nama, urutan) values (?,?,?)`;
    const [result] = await conn.execute(sql, [id_proyek, nama, rows[0].nextOrder]);
    return result;
  });

const reorder = ({ id_proyek, ids }) =>
  withTransaction(pool, async (conn) => {
    await assertOfferEditable(conn, id_proyek);
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Urutan sub proyek tidak valid.");
    }
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await conn.execute(
      `select id from ${table} where id_proyek = ? and id in (${placeholders})`,
      [id_proyek, ...ids],
    );
    if (rows.length !== ids.length) {
      throw new Error("Sub proyek tidak valid.");
    }
    for (const [urutan, id] of ids.entries()) {
      await conn.execute(`update ${table} set urutan = ? where id = ?`, [
        urutan,
        id,
      ]);
    }
  });

const update = ({ id, id_proyek, nama }) =>
  withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id_proyek FROM ${table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    const currentProjectId = rows[0]?.id_proyek;
    if (currentProjectId) {
      await assertOfferEditable(conn, currentProjectId);
    }
    if (id_proyek && String(id_proyek) !== String(currentProjectId)) {
      await assertOfferEditable(conn, id_proyek);
    }
    const sql = `update ${table} set id_proyek=?, nama=? where id=?`;
    const [result] = await conn.execute(sql, [id_proyek, nama, id]);
    return result;
  });

const destroy = ({ id }) =>
  withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id_proyek FROM ${table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    const idProyek = rows[0]?.id_proyek;
    if (idProyek) await assertOfferEditable(conn, idProyek);
    const sql = `delete from ${table} where id = ?`;
    const [result] = await conn.execute(sql, [id]);
    return result;
  });

module.exports = { list, create, update, destroy, reorder };
