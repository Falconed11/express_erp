import { defaultAsyncController } from "../helpers/default.js";
import PerusahaanService from "../services/perusahaan.service.js";

const PerusahaanController = {
  async get(req, res, next) {
    defaultAsyncController(async (req) => PerusahaanService.get(req.query), {
      req,
      res,
      next,
    });
  },
};
export default PerusahaanController;
