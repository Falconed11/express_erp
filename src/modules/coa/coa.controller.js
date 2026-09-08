import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./coa.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  customController: {
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
