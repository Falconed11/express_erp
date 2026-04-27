import { defaultAsyncController } from "../../helpers/default.js";
import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./produk.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  disableNama: true,
  customController: {
    async getKategori(req, res, next) {
      defaultAsyncController(async () => Service.listKategori(), {
        req,
        res,
        next,
      });
    },

    async transfer(req, res, next) {
      defaultAsyncController(async () => Service.transfer(req.body), {
        req,
        res,
        next,
      });
    },
  },
});

export default Controller;
