const { withTransaction } = require("../helpers/transaction.cjs");
const { create: insertInstansi } = require("./customer.cjs");
const { pool } = require("./db.2.0.0.cjs");

const table = "aktivitassales";

const list = async ({
  id,
  id_instansi,
  id_karyawan,
  id_jenis_aktivitas,
  page = null,
  rowsPerPage = null,
  start = null,
  end = null,
  includeInactive = false,
  status = "",
}) => {
  console.log(id_karyawan);
  const showInactive = [true, 1, "1", "true"].includes(includeInactive);
  const statusConditions = {
    completed: "a.tanggalselesai IS NOT NULL",
    overdue: "a.tanggalselesai IS NULL AND DATE(a.tanggal) < CURDATE()",
    today: "a.tanggalselesai IS NULL AND DATE(a.tanggal) = CURDATE()",
    this_week:
      "a.tanggalselesai IS NULL AND DATE(a.tanggal) > CURDATE() AND YEARWEEK(a.tanggal, 1) = YEARWEEK(CURDATE(), 1)",
    upcoming:
      "a.tanggalselesai IS NULL AND DATE(a.tanggal) > CURDATE() AND YEARWEEK(a.tanggal, 1) > YEARWEEK(CURDATE(), 1)",
  };
  const statusCondition = Object.prototype.hasOwnProperty.call(
    statusConditions,
    status,
  )
    ? statusConditions[status]
    : null;
  if (status && !statusCondition)
    throw new Error("Filter status tidak valid.");
  const conditions = [
    ...(id ? ["a.id = ?"] : []),
    ...(id_instansi ? ["a.id_instansi = ?"] : []),
    ...(id_karyawan ? ["a.id_karyawan = ?"] : []),
    ...(id_jenis_aktivitas ? ["a.id_jenis_aktivitas = ?"] : []),
    ...(start ? ["a.tanggal >= ?"] : []),
    ...(end ? ["a.tanggal < DATE_ADD(?, INTERVAL 1 DAY)"] : []),
    ...(!showInactive ? ["a.aktif = 1"] : []),
    ...(status ? [statusCondition] : []),
  ];
  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const limitClause = page && rowsPerPage ? "LIMIT ? OFFSET ?" : "";
  const sql = `select a.*, DATE_FORMAT(a.tanggal, '%Y-%m-%d') AS tanggal_date,
k.nama namakaryawan, i.nama namainstansi,
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
    ...(id_jenis_aktivitas ? [id_jenis_aktivitas] : []),
    ...(start ? [start] : []),
    ...(end ? [end] : []),
  ];
  const values = [
    ...valuesCount,
    ...(page && rowsPerPage ? [rowsPerPage, (page - 1) * rowsPerPage] : []),
  ];
  console.log(values);
  const [rows] = await pool.execute(sql, values);
  const results = rows.map(({ tanggal_date, ...row }) => ({
    ...row,
    tanggal: tanggal_date,
  }));
  const res =
    page && rowsPerPage
      ? await pool.execute(
          `select count(*) count from ${table} a ${whereClause}`,
          valuesCount,
        )
      : null;
  const count = res?.[0]?.[0]?.count ?? 0;
  return { count, results };
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
  if (isSelesai !== null && typeof isSelesai !== "boolean")
    throw new Error("Status penyelesaian tidak valid.");
  if (rest.aktif !== undefined) {
    if ([true, 1, "1"].includes(rest.aktif)) {
      rest.aktif = 1;
    } else if ([false, 0, "0"].includes(rest.aktif)) {
      rest.aktif = 0;
    } else {
      throw new Error("Status aktif tidak valid.");
    }
  }
  const activityFields = [
    "id_karyawan",
    "id_proyek",
    "id_instansi",
    "id_jenis_aktivitas",
    "tanggal",
    "catatan",
  ];
  if (activityFields.some((field) => rest[field] !== undefined)) {
    const [existingRows] = await pool.execute(
      `SELECT DATE(created_at) = CURDATE() AS created_today FROM ${table} WHERE id = ?`,
      [id],
    );
    if (!existingRows.length)
      throw new Error(`Aktivitas Sales id: ${id} tidak ditemukan`);
    if (!isSuper && Number(existingRows[0].created_today) !== 1) {
      throw new Error(
        "Aktivitas hanya dapat diubah pada hari pembuatan data atau oleh super.",
      );
    }
  }
  const completionFields = [
    "pic",
    "jabatan",
    "kontak",
    "email",
    "keterangan_hasil",
  ];
  if (
    completionFields.some((field) => rest[field] !== undefined) &&
    isSelesai === null
  ) {
    throw new Error(
      "Data penyelesaian hanya dapat diubah melalui fitur penyelesaian.",
    );
  }
  if (
    isSelesai === true &&
    [
      ["pic", "PIC"],
      ["jabatan", "Jabatan"],
      ["kontak", "Kontak"],
      ["keterangan_hasil", "Keterangan Hasil"],
    ].some(([field]) => !String(rest[field] ?? "").trim())
  ) {
    throw new Error(
      "PIC, Jabatan, Kontak, dan Keterangan Hasil wajib diisi jika penyelesaian ditandai selesai.",
    );
  }
  if (
    rest.id_instansi !== undefined ||
    rest.id_jenis_aktivitas !== undefined
  ) {
    if (rest.id_jenis_aktivitas !== undefined && !rest.id_jenis_aktivitas)
      throw new Error("Aktivitas belum dipilih.");
    const [existingRows] = await pool.execute(
      `SELECT id_instansi, id_jenis_aktivitas, DATE(created_at) = CURDATE() AS created_today FROM ${table} WHERE id = ?`,
      [id],
    );
    if (!existingRows.length)
      throw new Error(`Aktivitas Sales id: ${id} tidak ditemukan`);
    const existing = existingRows[0];
    const isInstansiChanged =
      rest.id_instansi !== undefined &&
      String(rest.id_instansi ?? "") !== String(existing.id_instansi ?? "");
    const isActivityChanged =
      rest.id_jenis_aktivitas !== undefined &&
      String(rest.id_jenis_aktivitas) !==
        String(existing.id_jenis_aktivitas ?? "");
    if (
      !isSuper &&
      Number(existing.created_today) !== 1 &&
      (isInstansiChanged || isActivityChanged)
    ) {
      throw new Error(
        "Instansi dan aktivitas hanya dapat diubah pada hari pembuatan data atau oleh super.",
      );
    }
    if (rest.id_jenis_aktivitas !== undefined && isActivityChanged) {
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
  let completionRecord;
  if (isSelesai !== null) {
    const [rows] = await pool.execute(
      `SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, tanggalselesai FROM ${table} WHERE id = ?`,
      [id],
    );
    if (!rows.length)
      throw new Error(`Aktivitas Sales id: ${id} tidak ditemukan`);
    completionRecord = rows[0];
    const editFrom = Date.parse(`${completionRecord.tanggal}T09:00:00.000Z`);
    if (Date.now() < editFrom)
      throw new Error(
        "Penyelesaian hanya dapat diubah mulai pukul 16.00 WIB pada tanggal rencana kunjungan.",
      );
  }
  if (isSelesai === true) {
    const selectedCompletionDateTime = rest.tanggalselesai;
    if (
      typeof selectedCompletionDateTime !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(selectedCompletionDateTime)
    ) {
      throw new Error("Tanggal dan waktu penyelesaian tidak valid.");
    }
    const parsedCompletionDateTime = new Date(
      `${selectedCompletionDateTime}:00Z`,
    );
    if (
      Number.isNaN(parsedCompletionDateTime.getTime()) ||
      parsedCompletionDateTime.toISOString().slice(0, 16) !==
        selectedCompletionDateTime
    ) {
      throw new Error("Tanggal dan waktu penyelesaian tidak valid.");
    }
    if (selectedCompletionDateTime.slice(0, 10) < completionRecord.tanggal) {
      throw new Error(
        "Tanggal penyelesaian harus sama dengan atau setelah tanggal rencana kunjungan.",
      );
    }
    fields.push("tanggalselesai=?");
    values.push(`${selectedCompletionDateTime.replace("T", " ")}:00`);
    delete rest.tanggalselesai;
  }
  if (isSelesai === false) {
    fields.push("tanggalselesai=?");
    values.push(null);
    delete rest.tanggalselesai;
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
    "aktif",
    "catatan",
    "output",
    "tindakanselanjutnya",
    "keterangan_hasil",
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

const destroy = async ({ id, isSuper = false }) => {
  if (id == null) throw new Error("Id tidak valid");
  const [existingRows] = await pool.execute(
    `SELECT DATE(created_at) = CURDATE() AS created_today FROM ${table} WHERE id = ?`,
    [id],
  );
  if (!existingRows.length)
    throw new Error(`Aktivitas Sales id: ${id} tidak ditemukan`);
  if (!isSuper && Number(existingRows[0].created_today) !== 1) {
    throw new Error(
      "Aktivitas Sales hanya dapat dihapus pada hari pembuatan data atau oleh super.",
    );
  }
  const sql = `delete from ${table} where id =?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, update, destroy };
