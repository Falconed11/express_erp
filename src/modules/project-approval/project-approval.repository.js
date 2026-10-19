import db from "../../config/db.js";
import {
  getRequiredApprovalLevel,
  isApprovalSufficient,
} from "./project-approval.rules.js";

const getPriceRows = async (executor, idProyek, versi, lock = false) => {
  const [rows] = await executor.execute(
    `SELECT kp.harga, kp.hargakustom, p.hargajual, p.hargabatas
     FROM keranjangproyek kp
     LEFT JOIN produk p ON p.id = kp.id_produk
     WHERE kp.id_proyek = ? AND kp.versi = ?${lock ? " FOR UPDATE" : ""}`,
    [idProyek, versi],
  );
  return rows;
};

const getSavedApproval = async (executor, idProyek, versi, lock = false) => {
  const [rows] = await executor.execute(
    `SELECT approved_level, approved_by, approved_role, approved_at
     FROM proyek_penawaran_approval
     WHERE id_proyek = ? AND versi = ? AND aktif = 1
     LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [idProyek, versi],
  );
  return rows[0] ?? null;
};

const createStatus = async (executor, idProyek, versi) => {
  const priceRows = await getPriceRows(executor, idProyek, versi);
  const requiredLevel = getRequiredApprovalLevel(priceRows);
  const savedApproval = await getSavedApproval(executor, idProyek, versi);
  const approvedLevel = savedApproval?.approved_level ?? null;
  return {
    id_proyek: idProyek,
    versi,
    requiredLevel,
    approvedLevel,
    approvedBy: savedApproval?.approved_by ?? null,
    approvedRole: savedApproval?.approved_role ?? null,
    approvedAt: savedApproval?.approved_at ?? null,
    hasApproval: Boolean(approvedLevel),
    isApproved: isApprovalSufficient(requiredLevel, approvedLevel),
  };
};

export const getProjectApprovalStatus = async (idProyek, versi) =>
  createStatus(db, idProyek, versi);

export const getProjectApprovalStatuses = async (idProyek) => {
  const [versions] = await db.execute(
    `SELECT versi FROM keranjangproyek WHERE id_proyek = ?
     UNION
     SELECT versi FROM rekapitulasiproyek WHERE id_proyek = ?
     ORDER BY versi`,
    [idProyek, idProyek],
  );
  return Promise.all(
    versions.map(({ versi }) => createStatus(db, idProyek, Number(versi))),
  );
};

export const approveProjectOffer = async (
  idProyek,
  versi,
  user,
  canApprove,
) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const priceRows = await getPriceRows(conn, idProyek, versi, true);
    const requiredLevel = getRequiredApprovalLevel(priceRows);
    if (!requiredLevel) {
      const status = await createStatus(conn, idProyek, versi);
      await conn.commit();
      return status;
    }
    if (!canApprove(requiredLevel, user.peran)) {
      const error = new Error(
        requiredLevel === "owner"
          ? "Persetujuan owner atau super diperlukan untuk harga di bawah harga batas."
          : "Persetujuan head-sales atau lebih tinggi diperlukan untuk harga di bawah harga jual.",
      );
      error.statusCode = 403;
      throw error;
    }
    if (!user.id_karyawan) {
      const error = new Error(
        "Data karyawan untuk pemberi persetujuan tidak tersedia.",
      );
      error.statusCode = 403;
      throw error;
    }

    await conn.execute(
      `INSERT INTO proyek_penawaran_approval
        (id_proyek, versi, approved_level, approved_by, approved_role, approved_at,
         aktif, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, ?, ?)
       ON DUPLICATE KEY UPDATE
         approved_level = VALUES(approved_level),
         approved_by = VALUES(approved_by),
         approved_role = VALUES(approved_role),
         approved_at = CURRENT_TIMESTAMP,
         aktif = 1,
         updated_at = CURRENT_TIMESTAMP,
         updated_by = VALUES(updated_by)`,
      [
        idProyek,
        versi,
        requiredLevel,
        user.id_karyawan,
        user.peran,
        user.id_karyawan,
        user.id_karyawan,
      ],
    );
    const status = await createStatus(conn, idProyek, versi);
    await conn.commit();
    return status;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const cancelProjectOfferApproval = async (
  idProyek,
  versi,
  user,
  canCancel,
) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const savedApproval = await getSavedApproval(conn, idProyek, versi, true);
    if (savedApproval?.approved_level) {
      const approval = {
        approvedBy: savedApproval.approved_by,
        approvedLevel: savedApproval.approved_level,
      };
      if (!canCancel(approval, user)) {
        const error = new Error(
          "Anda tidak memiliki izin untuk membatalkan persetujuan penawaran ini.",
        );
        error.statusCode = 403;
        throw error;
      }
      await conn.execute(
        `UPDATE proyek_penawaran_approval
         SET approved_level = NULL,
             approved_by = NULL,
             approved_role = NULL,
             approved_at = NULL,
             updated_at = CURRENT_TIMESTAMP,
             updated_by = ?
         WHERE id_proyek = ? AND versi = ? AND aktif = 1`,
        [user?.id_karyawan ?? null, idProyek, versi],
      );
    }
    const status = await createStatus(conn, idProyek, versi);
    await conn.commit();
    return status;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};
