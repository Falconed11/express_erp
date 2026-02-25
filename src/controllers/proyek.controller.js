import { defaultAsyncController } from "../helpers/default.js";
import ProyekService from "../services/proyek.service.js";
import { buildMonthlyDateRangeFromPeriod } from "../utils/periode.utils.js";
import { assertAllowedValues } from "../utils/validation.js";

const ProyekController = {
  async get(req, res, next) {
    defaultAsyncController(async (req) => ProyekService.get(req.query), {
      req,
      res,
      next,
    });
  },
  async getStagedProductByProjectId(req, res, next) {
    defaultAsyncController(
      async (req) => ProyekService.getStagedProductByProjectId(req.params.id),
      {
        req,
        res,
        next,
      },
    );
  },
  async calculatePengeluaranById(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { id } = req.params;
        const { aggregate, lunas } = req.query;
        assertAllowedValues(aggregate, ["sum"], "Aggregate");
        if (lunas) assertAllowedValues(+lunas, [0, 1], "Lunas");
        return ProyekService.calculatePengeluaranById({
          id,
          aggregate,
          lunas,
        });
      },
      {
        req,
        res,
        next,
      },
    );
  },
  async calculatePembayaranById(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { id } = req.params;
        const { aggregate } = req.query;
        assertAllowedValues(aggregate, ["sum"], "Aggregate");
        return ProyekService.calculatePembayaranById({
          id,
          aggregate,
        });
      },
      {
        req,
        res,
        next,
      },
    );
  },
  async calculatePembayaranById(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { periode } = req.query;
        const { end: to, start: from } =
          buildMonthlyDateRangeFromPeriod(periode);
        assertAllowedValues(aggregate, ["sum"], "Aggregate");
        return ProyekService.getMonthlyReport({
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
export default ProyekController;
