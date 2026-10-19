const resetApproval = async (conn, idProyek, versi, updatedBy = null) => {
  await conn.execute(
    `UPDATE proyek_penawaran_approval
     SET approved_level = NULL,
         approved_by = NULL,
         approved_role = NULL,
         approved_at = NULL,
         updated_at = CURRENT_TIMESTAMP,
         updated_by = COALESCE(?, updated_by)
     WHERE id_proyek = ? AND versi = ? AND aktif = 1`,
    [updatedBy, idProyek, versi],
  );
};

const invalidateApproval = async (conn, idProyek, versi, updatedBy = null) => {
  await resetApproval(conn, idProyek, versi, updatedBy);
};

const invalidateProjectApprovals = async (conn, idProyek, updatedBy = null) => {
  await conn.execute(
    `UPDATE proyek_penawaran_approval
     SET approved_level = NULL,
         approved_by = NULL,
         approved_role = NULL,
         approved_at = NULL,
         updated_at = CURRENT_TIMESTAMP,
         updated_by = COALESCE(?, updated_by)
     WHERE id_proyek = ? AND aktif = 1`,
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
  invalidateApproval,
  invalidateProjectApprovals,
  invalidateProductApprovals,
};
