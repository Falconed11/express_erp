const { pool } = require("./db.2.0.0.cjs");
const { assertOfferEditable } = require("../src/modules/project-approval/project-approval-invalidation.cjs");

const table = "keteranganpenawaran";

const list = async ({ idProyekKeteranganPenawaran: _idProyekKeteranganPenawaran, idProyek }) => {
  const sql = `select kp.*, pk.id_proyek, pk.id_keteranganpenawaran from ${table} kp 
  left join proyek_keteranganpenawaran pk on kp.id=pk.id_keteranganpenawaran and pk.id_proyek=? 
  where 1=1`;
  const values = [idProyek ?? null];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const create = async ({ keterangan }) => {
  const sql = `insert into ${table} (keterangan) values (?)`;
  const values = [keterangan];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const update = async ({ keterangan, id }) => {
  const [projects] = await pool.execute(
    `SELECT DISTINCT pk.id_proyek
     FROM proyek_keteranganpenawaran pk
     INNER JOIN proyek_penawaran_approval a
       ON a.id_proyek = pk.id_proyek
     WHERE pk.id_keteranganpenawaran = ?
       AND a.aktif = 1 AND a.approved_level IS NOT NULL`,
    [id],
  );
  for (const project of projects) {
    await assertOfferEditable(pool, project.id_proyek);
  }
  const sql = `update ${table} set keterangan=? where id =?`;
  const values = [keterangan, id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const destroy = async ({ id }) => {
  const [projects] = await pool.execute(
    `SELECT DISTINCT pk.id_proyek
     FROM proyek_keteranganpenawaran pk
     INNER JOIN proyek_penawaran_approval a
       ON a.id_proyek = pk.id_proyek
     WHERE pk.id_keteranganpenawaran = ?
       AND a.aktif = 1 AND a.approved_level IS NOT NULL`,
    [id],
  );
  for (const project of projects) {
    await assertOfferEditable(pool, project.id_proyek);
  }
  const sql = `delete from ${table} where id =?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy };
