const { pool } = require("./db.2.0.0.cjs");
const table = "merek";
const normalizeAktif = (value) => {
  if ([true, 1, "1"].includes(value)) return 1;
  if ([false, 0, "0"].includes(value)) return 0;
  throw new Error("Status aktif tidak valid.");
};

const list = async ({ includeInactive, aktif } = {}) => {
  const activeFilter = [true, 1, "1"].includes(includeInactive)
    ? null
    : aktif === undefined
      ? 1
      : normalizeAktif(aktif);
  const sql = `Select m.*, coalesce(count(p.id)) nproduk From ${table} m
  left join produk p on p.id_merek=m.id
  ${activeFilter === null ? "" : "where m.aktif=?"}
  group by m.id
  order by nama`;
  const [result] = await pool.execute(
    sql,
    activeFilter === null ? [] : [activeFilter],
  );
  return result;
};

const transfer = async ({ currentId, targetId }) => {
  const sql = "update produk set id_merek = ? where id_merek = ?";
  const values = [targetId, currentId];
  const [result] = await pool.execute(sql, values);
  return result;
};

const create = async ({ nama, conn = pool }) => {
  if (!nama) throw new Error("Nama wajib diisi!");
  const sql = `insert into ${table} (nama) values (?)`;
  const values = [nama];
  const [result] = await conn.execute(sql, values);
  return result.insertId;
};

const update = async ({ id, nama, aktif }) => {
  if (!id) throw new Error("Merek tidak valid.");
  if (nama !== undefined && !nama) throw new Error("Nama wajib diisi!");
  if (nama === undefined && aktif === undefined) {
    throw new Error("Tidak ada data merek untuk diperbarui.");
  }
  const updates = [];
  const values = [];
  if (nama !== undefined) {
    updates.push("nama=?");
    values.push(nama);
  }
  if (aktif !== undefined) {
    updates.push("aktif=?");
    values.push(normalizeAktif(aktif));
  }
  values.push(id);
  const sql = `update ${table} set ${updates.join(", ")} where id=?`;
  const [result] = await pool.execute(sql, values);
  return result;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [result] = await pool.execute(sql, values);
  return result;
};

const deactivateAll = async () => {
  const [result] = await pool.execute(
    `UPDATE ${table} SET aktif=0 WHERE aktif=1`,
  );
  return result;
};

module.exports = { list, create, update, destroy, transfer, deactivateAll };
