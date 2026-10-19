const connection = require("./db.cjs");
const { pool } = require("./db.2.0.0.cjs");
const { withTransaction } = require("../helpers/transaction.cjs");
const {
  invalidateApproval,
} = require("../src/modules/project-approval/project-approval-invalidation.cjs");
const table = "rekapitulasiproyek";

const list = ({ id_proyek, versi }) => {
  const sql = `Select r.* From ${table} r left join proyek p on r.id_proyek = p.id where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } and r.versi=?`;
  const values = [];
  values.push(id_proyek ?? undefined);
  values.push(versi);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      console.log(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const listVersion = ({ id_proyek }) => {
  const sql = `select distinct versi from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  }`;
  const values = [];
  values.push(id_proyek ?? undefined);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = async ({
  id_proyek,
  versi,
  diskon,
  diskoninstalasi,
  pajak,
  pajakinstalasi = 0,
}) => {
  console.log({ id_proyek, versi });
  const sql = `insert into ${table} (id_proyek, versi, diskon, diskoninstalasi, pajak, pajakinstalasi) values (?, ?, ?, ?, ?, ?)`;
  const values = [
    id_proyek,
    versi,
    diskon,
    diskoninstalasi,
    pajak,
    pajakinstalasi,
  ];
  return withTransaction(pool, async (conn) => {
    const [result] = await conn.execute(sql, values);
    await invalidateApproval(conn, id_proyek, versi);
    return result;
  });
};

const createkategoriProyek = async ({ id_proyek, versi, jenis_proyek }) => {
  const audio = jenis_proyek.includes("audio") ? 1 : 0;
  const cctv = jenis_proyek.includes("cctv") ? 1 : 0;
  const multimedia = jenis_proyek.includes("multimedia") ? 1 : 0;
  const sql = `insert into ${table} (id_proyek, audio, cctv, multimedia, versi) values ( ?, '${audio}', '${cctv}', '${multimedia}', ?)`;
  const values = [id_proyek, versi];
  return withTransaction(pool, async (conn) => {
    const [result] = await conn.execute(sql, values);
    return result;
  });
};

const createNewVersion = ({ id_proyek, versi }) => {
  const sql = `INSERT INTO ${table} (id_proyek, diskon, diskoninstalasi, pajak, pajakinstalasi, audio, cctv, multimedia, versi) SELECT id_proyek, diskon, diskoninstalasi, pajak, pajakinstalasi, audio, cctv, multimedia, (SELECT max(versi) + 1 from ${table} where id_proyek=?) FROM ${table}
  WHERE id_proyek=? and versi=?`;
  const values = [id_proyek, id_proyek, versi];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = async ({
  id,
  diskon,
  diskoninstalasi,
  pajak,
  pajakinstalasi,
  updated_by,
}) => {
  const fields = [];
  const values = [];
  const isExist = (v) => v != null;
  if (isExist(diskon)) {
    fields.push("diskon=?");
    values.push(diskon);
  }
  if (isExist(diskoninstalasi)) {
    fields.push("diskoninstalasi=?");
    values.push(diskoninstalasi);
  }
  if (isExist(pajak)) {
    fields.push("pajak=?");
    values.push(pajak);
  }
  if (isExist(pajakinstalasi)) {
    fields.push("pajakinstalasi=?");
    values.push(pajakinstalasi);
  }
  if (fields.length === 0)
    return Promise.resolve({ affectedRows: 0, message: "No fields to update" });
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  return withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id_proyek, versi FROM ${table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!rows.length) throw new Error("Rekapitulasi proyek tidak ditemukan.");
    const [result] = await conn.execute(sql, values);
    await invalidateApproval(
      conn,
      rows[0].id_proyek,
      rows[0].versi,
      updated_by,
    );
    return result;
  });
};

const updatekategoriProyek = async ({ id, jenis_proyek, updated_by }) => {
  const audio = jenis_proyek.includes("audio") ? 1 : 0;
  const cctv = jenis_proyek.includes("cctv") ? 1 : 0;
  const multimedia = jenis_proyek.includes("multimedia") ? 1 : 0;
  const sql = `update ${table} set audio = ${audio}, cctv = ${cctv}, multimedia = ${multimedia} where id=?`;
  const values = [id];
  return withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id_proyek, versi FROM ${table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!rows.length) throw new Error("Rekapitulasi proyek tidak ditemukan.");
    const [result] = await conn.execute(sql, values);
    return result;
  });
};

const destroy = async ({ id, updated_by }) => {
  return withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id_proyek, versi FROM ${table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!rows.length) return { affectedRows: 0 };
    const [result] = await conn.execute(`DELETE FROM ${table} WHERE id = ?`, [
      id,
    ]);
    await invalidateApproval(
      conn,
      rows[0].id_proyek,
      rows[0].versi,
      updated_by,
    );
    return result;
  });
};

module.exports = {
  list,
  listVersion,
  create,
  createkategoriProyek,
  createNewVersion,
  update,
  updatekategoriProyek,
  destroy,
};
