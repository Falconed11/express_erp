import * as Service from "./device-monitor.service.js";

export const heartbeat = async (req, res, next) => {
  try {
    await Service.recordDevicePresence({
      user: req.user,
      body: req.body,
      userAgent: req.get("user-agent"),
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    res.json({ data: await Service.listDevicePresence({ user: req.user }) });
  } catch (error) {
    next(error);
  }
};
