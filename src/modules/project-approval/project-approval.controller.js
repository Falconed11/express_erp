import * as Service from "./project-approval.service.js";

const respondError = (res, error) =>
  res.status(error.statusCode || 400).json({
    success: false,
    message: error.message || "Gagal memproses persetujuan penawaran.",
  });

export const getStatus = async (req, res) => {
  try {
    res.json(await Service.getStatus(req.query, req.user));
  } catch (error) {
    respondError(res, error);
  }
};

export const approve = async (req, res) => {
  try {
    res.json(await Service.approve(req.body, req.user));
  } catch (error) {
    respondError(res, error);
  }
};

export const cancel = async (req, res) => {
  try {
    res.json(await Service.cancel(req.query, req.user));
  } catch (error) {
    respondError(res, error);
  }
};
