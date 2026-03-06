import { defaultAsyncController } from "../helpers/default.js";
import PerusahaanService from "../services/perusahaan.service.js";
import { buildMonthlyDateRangeFromPeriod } from "../utils/periode.utils.js";

const PerusahaanController = {
  async get(req, res, next) {
    defaultAsyncController(async (req) => PerusahaanService.get(req.query), {
      req,
      res,
      next,
    });
  },
  async getMonthlyReport(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { query, params } = req;
        const { periode } = query;
        const { from, to } = periode
          ? buildMonthlyDateRangeFromPeriod(periode)
          : {};
        const { idPerusahaan } = params;
        return PerusahaanService.getMonthlyReport({
          ...query,
          idPerusahaan: Number.isFinite(+idPerusahaan) ? idPerusahaan : null,
          from,
          to,
        });
      },
      {
        req,
        res,
        next,
      },
    );
  },
};
export default PerusahaanController;
