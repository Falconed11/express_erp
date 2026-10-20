import jwt from "jsonwebtoken";
import * as Model from "./role-switch.model.js";

const createHttpError = (statusCode, message) =>
  Object.assign(new Error(message), { statusCode });

export const createRoleSwitchService =
  ({
    getAccountRoleById = Model.getAccountRoleById,
    getRoleByName = Model.getRoleByName,
    secret = process.env.JWT_SECRET,
    signToken = jwt.sign,
  } = {}) =>
  async ({ user, peran }) => {
    if (!user?.can_switch_role || !user.id) {
      throw createHttpError(403, "Hanya akun super yang dapat mengganti peran");
    }

    if (typeof peran !== "string" || !peran.trim()) {
      throw createHttpError(400, "Peran tujuan wajib dipilih");
    }

    const accountRole = await getAccountRoleById(user.id);
    if (accountRole !== "super") {
      throw createHttpError(403, "Akun super tidak lagi memiliki akses");
    }

    const role = await getRoleByName(peran.trim());
    if (!role) {
      throw createHttpError(404, "Peran tidak ditemukan");
    }

    const claims = {
      ...user,
      peran: role.nama,
      rank: role.rank,
      keteranganperan: role.keterangan,
      can_switch_role: true,
    };

    return { token: signToken(claims, secret) };
  };

export const switchRole = createRoleSwitchService();
