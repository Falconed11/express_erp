const { pool } = require("./db.2.0.0.cjs");
const table = "operasionalkantor";

const list = async ({
  id_karyawan,
  id_kategorioperasionalkantor,
  tanggal,
  start,
  end,
  id_kategori,
  groupbykategori,
}) => {
  const sql = `Select o.*,${
    groupbykategori
      ? " sum(biaya) totaloperasionalkantor, count(biaya) totaltransaksioperasionalkantor,"
      : ""
  } p.nama perusahaan, mp.nama metodepembayaran, mp.norekening, mp.atasnama, k.nama karyawan, ko.id id_kategorioperasionalkantor, ko.nama kategori from ${table} o
  left join karyawan k on o.id_karyawan = k.id
  left join kategorioperasionalkantor ko on o.id_kategorioperasionalkantor = ko.id
  left join metodepembayaran mp on o.id_metodepembayaran = mp.id
  left join perusahaan p on o.id_perusahaan = p.id
  where 1=1 ${
    id_karyawan ? `and id_karyawan=?` : ""
  } ${start ? `and tanggal>=?` : ""}
   ${end ? `and tanggal<=?` : ""} ${
     id_kategori ? `and id_kategorioperasionalkantor=?` : ""
   }${groupbykategori ? " group by ko.id" : ""}
  order by${groupbykategori ? " kategori," : ""} o.tanggal desc`;
  const values = [];
  if (id_karyawan) values.push(id_karyawan);
  if (start) values.push(start);
  if (end) values.push(end);
  if (id_kategori) values.push(id_kategori);
  try {
    const [res] = await pool.execute(sql, values);
    console.log(groupbykategori);
    return res;
  } catch (err) {
    console.log(sql);
    console.error("Query error : ", err);
    throw err;
  }
};

const create = async ({
  id_karyawan,
  id_kategorioperasionalkantor,
  id_metodepembayaran,
  id_perusahaan,
  karyawan,
  kategori,
  biaya = 0,
  tanggal = new Date(),
  keterangan = "",
}) => {
  if (!id_kategorioperasionalkantor && !kategori)
    throw new Error("Kategori operasional kantor wajib diisi!");
  const sql = `insert into ${table} (id_karyawan, id_kategorioperasionalkantor, id_metodepembayaran, id_perusahaan, biaya, tanggal, keterangan) values (${
    karyawan ? `(select id from karyawan where nama=?)` : `?`
  }, ${
    kategori ? `(select id from kategorioperasionalkantor where nama=?)` : `?`
  }, ?, ?, ?, ?, ?)`;
  const values = [
    karyawan ?? id_karyawan,
    kategori ?? id_kategorioperasionalkantor,
    id_metodepembayaran,
    id_perusahaan,
    biaya,
    tanggal,
    keterangan,
  ];
  const [res] = await pool.execute(sql, values);
  return res;
};

const update = async ({ id, ...rest }) => {
  const allowedFields = [
    "id_karyawan",
    "id_kategotioperasionalkantor",
    "id_metodepembayaran",
    "id_perusahaan",
    "biaya",
    "tanggal",
    "keterangan",
  ];
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(rest)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key}=?`);
      values.push(value);
    }
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  [updateResult] = await pool.execute(sql, values);
  return updateResult;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [res] = await pool.execute(sql, values);
  return res;
};

module.exports = { list, create, update, destroy };
