import { defaultAsyncController } from "../helpers/default.js";
import PengeluaranProyekService from "../services/pengeluaran-proyek.service.js";

const PengeluaranProyekController = {
  async get(req, res, next) {
    defaultAsyncController(
      async (req) => PengeluaranProyekService.get(req.query),
      {
        req,
        res,
        next,
      },
    );
  },
};
export default PengeluaranProyekController;
