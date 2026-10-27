const { pool } = require("./db.2.0.0.cjs");

const table = "instansi";

const normalizeAktif = (value) => {
  if ([true, 1, "1"].includes(value)) return 1;
  if ([false, 0, "0"].includes(value)) return 0;
  throw new Error("Filter aktif tidak valid.");
};

const list = async ({ id, limit, aktif, includeInactive }) => {
  const activeFilter = [true, 1, "1"].includes(includeInactive)
    ? null
    : aktif === undefined
      ? id
        ? null
        : 1
      : normalizeAktif(aktif);
  const pembayaran = `select id_instansi id, sum(nominal) pembayaran from pembayaranproyek pp left join proyek p on pp.id_proyek=p.id group by id_instansi`;
  const produksi = `select id_instansi id, sum(jumlah*harga) produksi, count(*) jumlah_proyek from pengeluaranproyek pp left join proyek p on pp.id_proyek=p.id group by id`;
  const jumlah_proyek = `select id_instansi id, count(*) jumlah_proyek from proyek group by id_instansi`;
  const sql = `select ji.nama jenisinstansi, gi.nama golonganinstansi, i.id_jenisinstansi, i.id_golonganinstansi, i.swasta, i.kota, i.id, i.nama, i.alamat, coalesce((pm.pembayaran-p.produksi),0) provit, coalesce(jp.jumlah_proyek,0) jumlah_proyek, i.lastuser, i.lastupdate, i.updated_by, i.updated_at, k.nama namakaryawan, k.nama AS updated_by_name from ${table} i
  left join (${pembayaran}) pm on i.id=pm.id
  left join (${produksi}) p on i.id=p.id
  left join (${jumlah_proyek}) jp on i.id = jp.id
  left join karyawan k on k.id=i.updated_by
  left join jenisinstansi ji on ji.id=i.id_jenisinstansi
  left join golonganinstansi gi on gi.id=i.id_golonganinstansi
  where 1=1 ${id ? "and i.id=?" : ""} ${activeFilter === null ? "" : "and i.aktif=?"}
  order by i.nama ${limit ? "limit ?" : ""}`;
  const values = [];
  if (id) values.push(id);
  if (activeFilter !== null) values.push(activeFilter);
  if (limit) values.push(limit);
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const transfer = async ({ id, newId }) => {
  if (!id) throw new Error("Id lama wajib diisi!");
  if (!newId) throw new Error("Id baru wajib diisi!");
  const field = "id_instansi";
  try {
    const sql = `update proyek set ${field}= ? where ${field} = ?`;
    const values = [newId, id];
    const [res] = await pool.execute(sql, values);
    return res;
  } catch (err) {
    console.error("Query error: ", err);
    throw err;
  }
};

const create = async ({
  nama,
  swasta,
  id_jenisinstansi = null,
  id_golonganinstansi = null,
  kota,
  alamat = "",
  updated_by,
  lastuser = null,
  conn = pool,
}) => {
  if (!nama || !kota || !swasta)
    throw new Error("Nama, Kota, dan Swasta/Negri wajib diisi!");
  const auditUser = updated_by ?? lastuser;
  const sql = `insert into ${table} (nama, swasta, id_jenisinstansi, id_golonganinstansi, kota, alamat, lastuser, updated_by) values (?,?,?,?,?,?,?,?)`;
  const values = [
    nama,
    swasta,
    id_jenisinstansi,
    id_golonganinstansi,
    kota,
    alamat,
    auditUser,
    auditUser,
  ];
  const [result] = await conn.execute(sql, values);
  return result.insertId;
};

const update = async ({ id, ...rest }) => {
  const allowedFields = [
    "nama",
    "swasta",
    "id_jenisinstansi",
    "id_golonganinstansi",
    "kota",
    "alamat",
    "lastuser",
    "updated_by",
    "aktif",
  ];
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(rest)) {
    if (allowedFields.includes(key) && value !== undefined) {
      if (key === "updated_by" || key === "lastuser") {
        fields.push("updated_by=?", "lastuser=?");
        values.push(value, value);
      } else {
        fields.push(`${key}=?`);
        values.push(key === "aktif" ? normalizeAktif(value) : value);
      }
    }
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  const [updateResult] = await pool.execute(sql, values);
  return updateResult;
};

const destroy = async ({ id, updated_by, lastuser }) => {
  return update({ id, aktif: 0, updated_by: updated_by ?? lastuser });
};

module.exports = { list, create, update, destroy, transfer };
