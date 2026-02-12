import { calculateService } from "../services/default.service.js";
import { successResponse } from "../utils/response.js";
import { conditionalArrayBuilder, qWhereIdPerusahaan } from "../utils/tools.js";

export const defaultAsyncController = async (serviceFn, { req, res, next }) => {
  try {
    const data = await serviceFn(req);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const defaultCalculateFilterByIdPerusahaanService = ({
  id_perusahaan,
  ...rest
}) => {
  calculateService({
    ...rest,
    customVal: conditionalArrayBuilder(id_perusahaan),
    customWhere: qWhereIdPerusahaan(id_perusahaan),
  });
};
