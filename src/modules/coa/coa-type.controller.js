import { defaultAsyncController } from "../../helpers/default.js";
import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./coa-type.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  customController: {
    async create(req, res, next) {
      defaultAsyncController(
        async (req) => {
          const { body } = req;
          if (!body.nama) throw new Error("Nama tidak boleh kosong!");
          return Service.create(body);
        },
        {
          req,
          res,
          next,
        },
      );
    },
    async patch(req, res, next) {
      defaultAsyncController(
        async (req) => {
          const { id } = req.params;
          if (!id) throw new Error("Id tidak boleh kosong!");
          return Service.patch(id, req.body);
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
