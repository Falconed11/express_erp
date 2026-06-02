import { defaultAsyncController } from "../../helpers/default.js";
import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./laporan.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  customController: {
    async getById(req, res, next) {
      defaultAsyncController(
        async (req) => {
          const { id } = req.params;
          const { query: data } = req;
          if (!id) throw new Error("Id tidak boleh kosong!");
          return Service.getById(id, data);
        },
        {
          req,
          res,
          next,
        },
      );
    },
  },
});

export default Controller;
