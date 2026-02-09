import { defaultAsyncController } from "../helpers/default.js";
import PembayaranProyekService from "../services/pembayaran-proyek.service.js";

const PembayaranProyekController = {
  async get(req, res, next) {
    defaultAsyncController(
      async (req) => PembayaranProyekService.get(req.query),
      {
        req,
        res,
        next,
      },
    );
  },
};
export default PembayaranProyekController;
