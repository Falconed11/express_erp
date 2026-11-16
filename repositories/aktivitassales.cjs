const { withTransaction } = require("../helpers/transaction.cjs");
const { create: insertInstansi } = require("./customer.cjs");
const { pool } = require("./db.2.0.0.cjs");

const table = "aktivitassales";

const list = async ({
  id,
  id_instansi,
  id_karyawan,
  page = null,
  rowsPerPage = null,
  start = null,
  end = null,
}) => {
  console.log(id_karyawan);
  const conditions = [
    ...(id ? ["a.id = ?"] : []),
    ...(id_instansi ? ["a.id_instansi = ?"] : []),
    ...(id_karyawan ? ["a.id_karyawan = ?"] : []),
    ...(start ? ["a.tanggal >= ?"] : []),
    ...(end ? ["a.tanggal <= ?"] : []),
  ];
  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const limitClause = page && rowsPerPage ? "LIMIT ? OFFSET ?" : "";
  const sql = `select a.*, k.nama namakaryawan, i.nama namainstansi,
activity_type.nama aktivitas, creator.nama created_by_name,
updater.nama updated_by_name from ${table} a
left join karyawan k on k.id=a.id_karyawan
left join instansi i on i.id=a.id_instansi
left join jenis_aktivitas_sales activity_type on activity_type.id=a.id_jenis_aktivitas
left join karyawan creator on creator.id=a.created_by
left join karyawan updater on updater.id=a.updated_by
  ${whereClause} order by a.tanggal desc ${limitClause}`;
  console.log(sql);
  const valuesCount = [
    ...(id ? [id] : []),
    ...(id_instansi ? [id_instansi] : []),
    ...(id_karyawan ? [id_karyawan] : []),
    ...(start ? [start] : []),
    ...(end ? [end] : []),
  ];
  const values = [
    ...valuesCount,
    ...(page && rowsPerPage ? [rowsPerPage, (page - 1) * rowsPerPage] : []),
  ];
  console.log(values);
  const [rows] = await pool.execute(sql, values);
  const res =
    page && rowsPerPage
      ? await pool.execute(
          `select count(*) count from ${table} a ${whereClause}`,
          valuesCount,
        )
      : null;
  const count = res?.[0]?.[0]?.count ?? 0;
  return { count, results: rows };
};

const create = async ({
  id_karyawan,
  id_proyek = null,
  id_instansi = null,
  id_jenis_aktivitas,
  tanggal = new Date(),
  pic = "",
  jabatan = "",
  kontak = "",
  email = "",
  catatan = "",
  output = "",
  tindakanselanjutnya = "",
  instansi = null,
  created_by = null,
  ...rest
}) => {
  try {
    const result = await withTransaction(pool, async (conn) => {
      if (!id_karyawan) throw new Error("Karyawan wajib diisi!");
      if (!id_jenis_aktivitas)
        throw new Error("Aktivitas belum dipilih.");
      if (!tanggal) throw new Error("Tanggal kunjungan wajib diisi!");
      const [activityTypes] = await conn.execute(
        "SELECT id FROM jenis_aktivitas_sales WHERE id = ? AND aktif = 1",
        [id_jenis_aktivitas],
      );
      if (!activityTypes.length)
        throw new Error("Jenis aktivitas tidak ditemukan atau tidak aktif.");
      const sql = `insert into ${table} (id_karyawan, id_proyek, id_instansi, id_jenis_aktivitas, tanggal, pic, jabatan, kontak, email, catatan, output, tindakanselanjutnya, created_by, updated_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
      if (!id_instansi && instansi) {
        id_instansi = await insertInstansi({ ...rest, nama: instansi, conn });
      }
      const values = [
        id_karyawan,
        id_proyek,
        id_instansi,
        id_jenis_aktivitas,
        tanggal,
        pic,
        jabatan,
        kontak,
        email,
        catatan,
        output,
        tindakanselanjutnya,
        created_by,
        created_by,
      ];
      const [rows] = await conn.execute(sql, values);
      return {
        insertIdAktivitasSales: rows.insertId,
        insertIdInstansi: id_instansi,
      };
    });
    console.log(result);
    console.log("Data berhasil ditambahkan.");
    return result;
  } catch (err) {
    console.error("Error: ", err.message);
    throw err;
  }
};

const update = async ({ id, isSelesai = null, isSuper = false, ...rest }) => {
  if (id == null) throw new Error("Id tidak valid");
  if (rest.id_jenis_aktivitas !== undefined) {
    if (!rest.id_jenis_aktivitas)
      throw new Error("Aktivitas belum dipilih.");
    const [existingRows] = await pool.execute(
      `SELECT id_jenis_aktivitas FROM ${table} WHERE id = ?`,
      [id],
    );
    if (!existingRows.length)
      throw new Error(`Aktivitas Sales id: ${id} tidak ditemukan`);
    const isUnchanged =
      String(existingRows[0].id_jenis_aktivitas) ===
      String(rest.id_jenis_aktivitas);
    if (!isUnchanged) {
      const [activityTypes] = await pool.execute(
        "SELECT id FROM jenis_aktivitas_sales WHERE id = ? AND aktif = 1",
        [rest.id_jenis_aktivitas],
      );
      if (!activityTypes.length)
        throw new Error("Jenis aktivitas tidak ditemukan atau tidak aktif.");
    }
  }
  if (rest.tanggal !== undefined) {
    if (!rest.tanggal) throw new Error("Tanggal kunjungan wajib diisi!");
    const [rows] = await pool.execute(
      `SELECT DATE(created_at) = CURDATE() AS created_today, DATE(tanggal) = DATE(?) AS same_visit_date FROM ${table} WHERE id = ?`,
      [rest.tanggal, id],
    );
    if (!rows.length)
      throw new Error(`Aktivitas Sales id: ${id} tidak ditemukan`);
    if (Number(rows[0].same_visit_date) === 1) {
      delete rest.tanggal;
    } else if (!isSuper && Number(rows[0].created_today) !== 1) {
      throw new Error(
        "Tanggal kunjungan hanya dapat diubah pada hari pembuatan data atau oleh super.",
      );
    }
  }
  const fields = [],
    values = [];
  if (isSelesai == true) {
    const res = await list({ id });
    const rows = res?.results;
    if (!rows.length)
      throw new Error(`Aktivitas Sales id: ${id} tidak ditemukan`);
    const now = new Date();
    if (
      !(
        new Date(rows[0].tanggal).setHours(0, 0, 0, 0) <
          now.setHours(0, 0, 0, 0) || now.getHours() >= 16
      )
    )
      throw new Error(
        "Penyelesaian dihari yang sama hanya dapat dilakukan setelah pukul 16.00 WIB.",
      );
    if (!rows[0].tanggalselesai) {
      fields.push("tanggalselesai=?");
      values.push(new Date());
    }
  }
  if (isSelesai == false) {
    fields.push("tanggalselesai=?");
    values.push(null);
  }
  const allowedFields = [
    "id_karyawan",
    "id_proyek",
    "id_instansi",
    "id_jenis_aktivitas",
    "tanggal",
    "pic",
    "jabatan",
    "kontak",
    "email",
    "catatan",
    "output",
    "tindakanselanjutnya",
    "updated_by",
  ];
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
  console.log(sql);
  const [result] = await pool.execute(sql, values);
  return result;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id =?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy };
