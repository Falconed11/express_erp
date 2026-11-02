const resetApproval = async (conn, idProyek, versi, updatedBy = null) => {
  await conn.execute(
    `UPDATE proyek_penawaran_approval
     SET approved_level = NULL,
         approved_by = NULL,
         approved_role = NULL,
         approved_at = NULL,
         updated_at = CURRENT_TIMESTAMP,
         updated_by = COALESCE(?, updated_by)
     WHERE id_proyek = ? AND versi = ? AND aktif = 1
       AND approved_level IS NULL`,
    [updatedBy, idProyek, versi],
  );
};

const assertOfferEditable = async (conn, idProyek, versi = null) => {
  const versionFilter = versi == null ? "" : "AND versi = ?";
  const values = versi == null ? [idProyek] : [idProyek, versi];
  const [approvals] = await conn.execute(
    `SELECT id
     FROM proyek_penawaran_approval
     WHERE id_proyek = ? AND aktif = 1
       AND approved_level IS NOT NULL ${versionFilter}
     LIMIT 1
     FOR UPDATE`,
    values,
  );
  if (approvals.length) {
    const error = new Error(
      "Penawaran sudah disetujui dan terkunci. Minta super membatalkan persetujuan terlebih dahulu.",
    );
    error.statusCode = 409;
    throw error;
  }
};

const invalidateApproval = async (conn, idProyek, versi, updatedBy = null) => {
  await assertOfferEditable(conn, idProyek, versi);
  await resetApproval(conn, idProyek, versi, updatedBy);
};

const invalidateProjectApprovals = async (conn, idProyek, updatedBy = null) => {
  await assertOfferEditable(conn, idProyek);
  await conn.execute(
    `UPDATE proyek_penawaran_approval
     SET approved_level = NULL,
         approved_by = NULL,
         approved_role = NULL,
         approved_at = NULL,
         updated_at = CURRENT_TIMESTAMP,
         updated_by = COALESCE(?, updated_by)
     WHERE id_proyek = ? AND aktif = 1 AND approved_level IS NULL`,
    [updatedBy, idProyek],
  );
};

const invalidateProductApprovals = async (conn, idProduk, updatedBy = null) => {
  const [versions] = await conn.execute(
    `SELECT DISTINCT id_proyek, versi
     FROM keranjangproyek
     WHERE id_produk = ?`,
    [idProduk],
  );
  for (const version of versions) {
    await resetApproval(conn, version.id_proyek, version.versi, updatedBy);
  }
};

module.exports = {
  assertOfferEditable,
  invalidateApproval,
  invalidateProjectApprovals,
  invalidateProductApprovals,
};
