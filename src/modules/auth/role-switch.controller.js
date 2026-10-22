import {
  companySwitch as companySwitchSession,
  switchRole as switchRoleSession,
} from "./role-switch.service.js";

export const switchRole = async (req, res, next) => {
  try {
    const result = await switchRoleSession({
      user: req.user,
      peran: req.body?.peran,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const listSwitchableCompanies = async (req, res, next) => {
  try {
    res.json(await companySwitchSession.listCompanies({ user: req.user }));
  } catch (error) {
    next(error);
  }
};

export const switchCompany = async (req, res, next) => {
  try {
    const result = await companySwitchSession.switchCompany({
      user: req.user,
      id_perusahaan: req.body?.id_perusahaan,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
