import { defaultAsyncController } from "../helpers/default.js";
import ProyekService from "../services/proyek.service.js";

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
};
export default ProyekController;
