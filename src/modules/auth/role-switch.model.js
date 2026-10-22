import pool from "../../config/db.js";

export const getAccountRoleById = async (userId) => {
  const [rows] = await pool.execute(
    "SELECT peran FROM `user` WHERE id = ? LIMIT 1",
    [userId],
  );
  return rows[0]?.peran ?? null;
};

export const getRoleByName = async (roleName) => {
  const [rows] = await pool.execute(
    "SELECT nama, rank, keterangan FROM peran WHERE nama = ? LIMIT 1",
    [roleName],
  );
  return rows[0] ?? null;
};

export const getCompanyOptions = async () => {
  const [rows] = await pool.execute(
    "SELECT id, nama FROM perusahaan ORDER BY nama, id",
  );
  return rows;
};

export const getCompanyById = async (companyId) => {
  const [rows] = await pool.execute(
    "SELECT id FROM perusahaan WHERE id = ? LIMIT 1",
    [companyId],
  );
  return rows[0] ?? null;
};
