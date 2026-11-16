import { generateDefaultCRUDController } from "../default/default.controller.js";
import { defaultAsyncController } from "../../helpers/default.js";
import Service from "./jenis-aktivitas-sales.service.js";

const Controller = {
  ...generateDefaultCRUDController(Service),
  async transfer(req, res, next) {
    defaultAsyncController(
      async () => {
        const { id } = req.params;
        const { target_id: targetId } = req.body ?? {};
        return Service.transfer(id, targetId, req.user?.id_karyawan);
      },
      { req, res, next },
    );
  },
};

export default Controller;
