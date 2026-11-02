import { generateDefaultCRUDController } from "../default/default.controller.js";
import { defaultAsyncController } from "../../helpers/default.js";
import Service from "./coa.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  customController: {
    async getMonthlyReport(req, res, next) {
      try {
        const data = await Service.getMonthlyReport({
          ...req.params,
          id_perusahaan: req.user?.id_perusahaan,
          visible_peran: req.user?.peran,
        });
        res.json({ success: true, message: "Success", data });
      } catch (error) {
        next(error);
      }
    },
    async getBalances(req, res, next) {
      defaultAsyncController(
        async (req) => Service.getBalances(req.params.id_perusahaan),
        { req, res, next },
      );
    },
    async getAll(req, res, next) {
      const query = { ...req.query, visible_peran: req.user?.peran };
      try {
        const data = await Service.getAll(query);
        res.json({ success: true, message: "Success", data });
      } catch (error) {
        next(error);
      }
    },
  },
});

export default Controller;
