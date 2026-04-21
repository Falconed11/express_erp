import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./laporan.model.js";

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {
    async getById(id, data) {
      const result = await Model.getById(id, data);
      if (!result) {
        throw new Error("Data not found");
      }
      return result;
    },
  },
});

export default Service;
