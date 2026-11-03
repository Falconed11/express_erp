import * as Service from "./live-chat.service.js";

export const listOnlineEmployees = async (_req, res, next) => {
  try {
    const data = await Service.listOnlineEmployees();
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const data = await Service.listMessages({
      afterId: req.query.after_id,
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await Service.createMessage({
      user: req.user,
      message: req.body?.message,
    });
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};
