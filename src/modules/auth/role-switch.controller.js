import { switchRole as switchRoleSession } from "./role-switch.service.js";

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
