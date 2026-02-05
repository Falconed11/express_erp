import PembayaranProyekService from "../services/pembayaran-proyek.service.js";
import { successResponse } from "../utils/response.js";

const PembayaranProyekController = {
  async get(req, res, next) {
    try {
      const data = await PembayaranProyekService.get(req.query);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },
};
export default PembayaranProyekController;
