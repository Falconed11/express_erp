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
