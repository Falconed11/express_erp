import * as service from "../services/proyek.service.js";
import { successResponse } from "../utils/response.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const data = await service.getAll();
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const getStagedProductByProjectId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await service.getStagedProductByProjectId(id);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};
