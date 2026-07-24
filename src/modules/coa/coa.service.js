import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./coa.model.js";
import LaporanModel from "../akuntansi/laporan.model.js";

const Service = generateDefaultCRUDService({
  ...Model,
  getAll: async (data) => {
    const { id_laporan, id_perusahaan, ...rest } = data;
    if (!id_laporan)
      return Model.getAll({
        ...rest,
        ...(id_perusahaan ? { id_perusahaan: [id_perusahaan, null] } : {}),
      });
    const rawCoas = await LaporanModel.getCoasWithoutValue(id_laporan, {
      id_perusahaan,
    });
    const coas = rawCoas || [];
    const coaIds = coas.map((coa) => coa?.id_coa).filter(Boolean);
    const finalData = {
      ...rest,
      ...(coaIds.length ? { id: coaIds } : {}),
    };
    return Model.getAll(finalData);
  },
});

export default Service;
