import jwt from "jsonwebtoken";
import * as Model from "./role-switch.model.js";

const createHttpError = (statusCode, message) =>
  Object.assign(new Error(message), { statusCode });

const assertCanSwitchContext = async (user, getAccountRoleById) => {
  if (!user?.can_switch_role || !user.id) {
    throw createHttpError(403, "Hanya akun super yang dapat mengganti konteks");
  }

  const accountRole = await getAccountRoleById(user.id);
  if (accountRole !== "super") {
    throw createHttpError(403, "Akun super tidak lagi memiliki akses");
  }
};

export const createRoleSwitchService =
  ({
    getAccountRoleById = Model.getAccountRoleById,
    getRoleByName = Model.getRoleByName,
    secret = process.env.JWT_SECRET,
    signToken = jwt.sign,
  } = {}) =>
  async ({ user, peran }) => {
    await assertCanSwitchContext(user, getAccountRoleById);

    if (typeof peran !== "string" || !peran.trim()) {
      throw createHttpError(400, "Peran tujuan wajib dipilih");
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

export const createCompanySwitchService = ({
  getAccountRoleById = Model.getAccountRoleById,
  getCompanyOptions = Model.getCompanyOptions,
  getCompanyById = Model.getCompanyById,
  secret = process.env.JWT_SECRET,
  signToken = jwt.sign,
} = {}) => ({
  async listCompanies({ user }) {
    await assertCanSwitchContext(user, getAccountRoleById);
    return getCompanyOptions();
  },

  async switchCompany({ user, id_perusahaan }) {
    await assertCanSwitchContext(user, getAccountRoleById);

    const companyId = Number(id_perusahaan);
    if (!Number.isSafeInteger(companyId) || companyId <= 0) {
      throw createHttpError(400, "Perusahaan tujuan tidak valid");
    }

    const company = await getCompanyById(companyId);
    if (!company) {
      throw createHttpError(404, "Perusahaan tidak ditemukan");
    }

    const claims = {
      ...user,
      id_perusahaan: companyId,
      can_switch_role: true,
    };

    return { token: signToken(claims, secret) };
  },
});

export const switchRole = createRoleSwitchService();
export const companySwitch = createCompanySwitchService();
