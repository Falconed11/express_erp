import MetodePembayaranService from "../services/metode-pembayaran.service.js";
import { successResponse } from "../utils/response.js";

const MetodePembayaranController = {
  async patch(req, res, next) {
    try {
      const result = await MetodePembayaranService.patch(
        req.params.id,
        req.body,
      );
      successResponse(res, result, `${NAME} updated`);
    } catch (err) {
      next(err);
    }
  },
};
export default MetodePembayaranController;
