const { withTransaction } = require("../helpers/transaction.cjs");
const { pool } = require("./db.2.0.0.cjs");
const table = "vendor";
const isMainVendor = (value) => [true, 1, "1"].includes(value);
const normalizeAktif = (value) => {
  if ([true, 1, "1"].includes(value)) return 1;
  if ([false, 0, "0"].includes(value)) return 0;
  throw new Error("Status aktif tidak valid.");
};

const list = async ({
  id,
  id_vendor_jenis,
  aktif,
  includeInactive,
  limit,
  columnName,
  sortOrder = "",
}) => {
  const activeFilter = [true, 1, "1"].includes(includeInactive)
    ? null
    : aktif === undefined
      ? id
        ? null
        : 1
      : normalizeAktif(aktif);
  const validColumns = ["nama"];
  // if (!Number.isInteger(limit) || limit <= 0) {
  //   return Promise.reject(new Error("Invalid limit value"));
  // }
  if (columnName && !validColumns.includes(columnName))
    throw new Error("Nama kolom tidak valid");
  sortOrder = sortOrder ? "desc" : "asc";
  const sql = `select v.*, MAX(k.nama) AS updated_by_name, sum(p.jumlah) nprodukkeluar, sum(pm.jumlah) nprodukmasuk, vj.nama vendorjenis from ${table} v
  left join pengeluaranproyek p on p.id_vendor=v.id
  left join produkmasuk pm on pm.id_vendor=v.id
  left join vendor_jenis vj on vj.id=v.id_vendor_jenis
  left join karyawan k on k.id=v.updated_by
  where 1=1 ${id ? `and v.id=?` : ""} ${id_vendor_jenis ? `and v.id_vendor_jenis=?` : ""} ${activeFilter === null ? "" : "and v.aktif=?"}
  group by v.id
  ${columnName ? ` order by ${columnName} ${sortOrder} , v.id` : ""} ${
    limit ? "limit 0, ?" : ""
  }`;
  const values = [];
  if (id) values.push(id);
  if (id_vendor_jenis) values.push(id_vendor_jenis);
  if (activeFilter !== null) values.push(activeFilter);
  if (limit) values.push(+limit);
  const [result] = await pool.execute(sql, values);
  return result;
};

const hutang = async () => {
  const sql = `select v.id, v.nama, h.hutang, v.alamat from vendor v LEFT JOIN (select v.id,v.nama,sum(pp.jumlah*pp.harga) hutang from pengeluaranproyek pp left join produk p on pp.id_produk = p.id LEFT JOIN vendor v on p.id_vendor=v.id where lunas=0 group by p.id_vendor) h on v.id=h.id order by v.nama`;
  const [result] = await pool.execute(sql);
  return result;
};

const transfer = async ({ id, newId }) => {
  try {
    const result = await withTransaction(pool, async (conn) => {
      const acc = {};
      const values = [newId, id];
      let sql = "UPDATE produkmasuk SET id_vendor = ? WHERE id_vendor = ?";
      const [produkmasukRes] = await conn.execute(sql, values);
      acc.produkmasuk = produkmasukRes;
      sql = "UPDATE pengeluaranproyek SET id_vendor = ? WHERE id_vendor = ?";
      const [pengeluaranproyekRes] = await conn.execute(sql, values);
      acc.pengeluaranproyek = pengeluaranproyekRes;
      return acc;
    });
    return result;
  } catch (err) {
    console.error("Transaction Error:", err.message || err);
    throw err;
  }
};

const create = async ({
  nama,
  alamat = "",
  id_vendor_jenis = null,
  is_main = false,
  updated_by,
  lastuser = null,
  conn = pool,
}) => {
  if (!nama) throw new Error("Nama wajib diisi!");
  const auditUser = updated_by ?? lastuser;
  const sql = `insert into ${table} (nama, alamat, id_vendor_jenis, is_main, lastuser, updated_by) values (?,?,?,?,?,?)`;
  const values = [
    nama,
    alamat,
    id_vendor_jenis,
    isMainVendor(is_main) ? 1 : 0,
    auditUser,
    auditUser,
  ];
  const [result] = await conn.execute(sql, values);
  return result.insertId;
};

const update = async ({
  id,
  nama,
  alamat = "",
  id_vendor_jenis = null,
  is_main,
  aktif,
  updated_by,
  lastuser,
}) => {
  if (nama === undefined && aktif !== undefined) {
    const fields = ["aktif=?"];
    const values = [normalizeAktif(aktif)];
    const auditUser = updated_by ?? lastuser;
    if (auditUser !== undefined) {
      fields.push("updated_by=?", "lastuser=?");
      values.push(auditUser, auditUser);
    }
    values.push(id);
    const [result] = await pool.execute(
      `UPDATE ${table} SET ${fields.join(", ")} WHERE id=?`,
      values,
    );
    return result;
  }
  if (!nama) throw new Error("Nama wajib diisi!");
  if (is_main !== undefined && !isMainVendor(is_main)) {
    const [defaults] = await pool.execute(
      "SELECT COUNT(*) AS total FROM produk_harga_default WHERE id_vendor = ? AND aktif = 1",
      [id],
    );
    if (Number(defaults[0]?.total) > 0)
      throw new Error(
        "Hapus default harga vendor sebelum menonaktifkan vendor utama.",
      );
  }
  const fields = ["nama=?", "alamat=?", "id_vendor_jenis=?"];
  const values = [nama, alamat, id_vendor_jenis];
  const auditUser = updated_by ?? lastuser;
  if (auditUser !== undefined) {
    fields.push("updated_by=?", "lastuser=?");
    values.push(auditUser, auditUser);
  }
  if (is_main !== undefined) {
    fields.push("is_main=?");
    values.push(isMainVendor(is_main) ? 1 : 0);
  }
  if (aktif !== undefined) {
    fields.push("aktif=?");
    values.push(normalizeAktif(aktif));
  }
  values.push(id);
  const sql = `update ${table} set ${fields.join(", ")} where id=?`;
  const [result] = await pool.execute(sql, values);
  return result;
};

const destroy = async ({ id, updated_by, lastuser }) => {
  return update({ id, aktif: 0, updated_by: updated_by ?? lastuser });
};

module.exports = { list, create, update, destroy, hutang, transfer };
