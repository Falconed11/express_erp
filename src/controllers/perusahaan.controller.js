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
        const { query } = req;
        const { periode } = query;
        const { start: from, end: to } = periode
          ? buildMonthlyDateRangeFromPeriod(periode)
          : {};
        return PerusahaanService.getMonthlyReport({
          ...query,
          ...req.params,
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
