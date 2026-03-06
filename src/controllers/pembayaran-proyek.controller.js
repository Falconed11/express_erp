import { defaultAsyncController } from "../helpers/default.js";
import PembayaranProyekService from "../services/pembayaran-proyek.service.js";
import { buildMonthlyDateRangeFromPeriod } from "../utils/periode.utils.js";

const PembayaranProyekController = {
  async get(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { query } = req;
        const { periode } = query;
        const { from, to } = periode
          ? buildMonthlyDateRangeFromPeriod(periode)
          : {};
        return PembayaranProyekService.get({ ...query, from, to });
      },
      {
        req,
        res,
        next,
      },
    );
  },
};
export default PembayaranProyekController;
