import ProyekModel from "../models/proyek.model.js";
import { getByPeriodeService } from "./default.service.js";

const ProyekService = {
  async get({ periode, idPerusahaan }) {
    if (periode)
      return getByPeriodeService(
        "proyek",
        periode,
        idPerusahaan,
        ProyekModel.buildLeftJoin,
        ProyekModel.select,
      );
    return ProyekModel.findAll();
  },
  async getStagedProductByProjectId(id) {
    return ProyekModel.findStagedProductByProjectId(id);
  },
};

export default ProyekService;
