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

export const defaultCalculateFilterByIdPerusahaanService = async ({
  idPerusahaan,
  ...rest
}) =>
  calculateService({
    ...rest,
    customVal: conditionalArrayBuilder(idPerusahaan),
    customWhere: qWhereIdPerusahaan(idPerusahaan),
    buildCustomJoin: (main) => `left join proyek p on p.id = ${main}.id_proyek`,
  });
