import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./app-config.model.js";

const Service = generateDefaultCRUDService({
  ...Model,
  getAll: async ({ id_perusahaan, ...rest }) => {
    if (id_perusahaan === "null" || id_perusahaan === null) {
      return Model.getAll({ ...rest, id_perusahaan: [null] });
    }

    return Model.getAll({
      ...rest,
      ...(id_perusahaan ? { id_perusahaan: [id_perusahaan, null] } : {}),
    });
  },
});

export default Service;
