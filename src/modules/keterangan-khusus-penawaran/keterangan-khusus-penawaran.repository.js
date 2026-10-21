import db from "../../config/db.js";

export const getProject = async (idProyek) => {
  const [rows] = await db.execute(
    `SELECT p.id, p.id_karyawan, sp.progress
     FROM proyek p
     LEFT JOIN statusproyek sp ON sp.id = p.id_statusproyek
     WHERE p.id = ?`,
    [idProyek],
  );
  return rows[0] ?? null;
};

export const hasOfferVersion = async (idProyek, versi) => {
  const [rows] = await db.execute(
    `SELECT EXISTS (
       SELECT 1 FROM keranjangproyek WHERE id_proyek = ? AND versi = ?
       UNION ALL
       SELECT 1 FROM rekapitulasiproyek WHERE id_proyek = ? AND versi = ?
     ) AS offer_exists`,
    [idProyek, versi, idProyek, versi],
  );
  return Boolean(rows[0]?.offer_exists);
};

export const list = async (idProyek, versi) => {
  const [rows] = await db.execute(
    `SELECT id, id_proyek, versi, keterangan, aktif, created_at, updated_at
     FROM keterangan_khusus_penawaran
     WHERE id_proyek = ? AND versi = ?
     ORDER BY id`,
    [idProyek, versi],
  );
  return rows;
};

export const create = async ({ idProyek, versi, keterangan, actorId }) => {
  const [result] = await db.execute(
    `INSERT INTO keterangan_khusus_penawaran
       (id_proyek, versi, keterangan, aktif, created_by, updated_by)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [idProyek, versi, keterangan, actorId, actorId],
  );
  return { id: result.insertId };
};

export const update = async ({
  id,
  idProyek,
  versi,
  keterangan,
  aktif,
  actorId,
}) => {
  const fields = [];
  const values = [];
  if (keterangan !== undefined) {
    fields.push("keterangan = ?");
    values.push(keterangan);
  }
  if (aktif !== undefined) {
    fields.push("aktif = ?");
    values.push(aktif ? 1 : 0);
  }
  fields.push("updated_by = ?", "updated_at = CURRENT_TIMESTAMP");
  values.push(actorId, id, idProyek, versi);

  const [result] = await db.execute(
    `UPDATE keterangan_khusus_penawaran
     SET ${fields.join(", ")}
     WHERE id = ? AND id_proyek = ? AND versi = ?`,
    values,
  );
  return result;
};

export const remove = async ({ id, idProyek, versi, actorId }) => {
  const [result] = await db.execute(
    `UPDATE keterangan_khusus_penawaran
     SET aktif = 0, updated_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND id_proyek = ? AND versi = ? AND aktif = 1`,
    [actorId, id, idProyek, versi],
  );
  return result;
};
