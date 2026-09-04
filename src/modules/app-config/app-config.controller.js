import { generateDefaultCRUDController } from "../default/default.controller.js";
import { defaultAsyncController } from "../../helpers/default.js";
import Service from "./app-config.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  disableNama: true,
  customController: {
    async create(req, res, next) {
      defaultAsyncController(
        async () => {
          if (!req.body.key) throw new Error("Key tidak boleh kosong!");
          return Service.create(req.body);
        },
        { req, res, next },
      );
    },
  },
});

export default Controller;
