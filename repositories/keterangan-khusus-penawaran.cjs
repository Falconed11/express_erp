const copyForVersion = async (
  conn,
  id_proyek,
  sourceVersion,
  targetVersion,
) => {
  const [existingRows] = await conn.execute(
    `SELECT id
     FROM keterangan_khusus_penawaran
     WHERE id_proyek = ? AND versi = ? AND aktif = 1
     LIMIT 1 FOR UPDATE`,
    [id_proyek, targetVersion],
  );
  if (existingRows.length > 0) return { affectedRows: 0 };

  const [result] = await conn.execute(
    `INSERT INTO keterangan_khusus_penawaran
       (id_proyek, versi, keterangan, aktif, created_by)
     SELECT id_proyek, ?, keterangan, 1, created_by
     FROM keterangan_khusus_penawaran
     WHERE id_proyek = ? AND versi = ? AND aktif = 1`,
    [targetVersion, id_proyek, sourceVersion],
  );
  return result;
};

module.exports = { copyForVersion };
