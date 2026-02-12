import OperasionalKantor from "../models/operasional-kantor.model.js";
import { buildMonthlyDateRangeFromPeriod } from "../utils/periode.utils.js";
const NAME = "golongan instansi";
const OperasionalKantorService = {
  async create(data) {
    if (!data.nama) {
      throw new Error(`Nama ${NAME} is required`);
    }
    return await OperasionalKantor.create({
      nama: data.nama,
      keterangan: data.keterangan || "",
      authorid_karyawan: data.authorid_karyawan,
      lastid_karyawan: data.lastid_karyawan,
    });
  },

  async getAll({ periode, aggregate, groupBy, idPerusahaan }) {
    const { start, end } = buildMonthlyDateRangeFromPeriod(periode);
    const defaultParam = { start, end, idPerusahaan };
    if (aggregate)
      return OperasionalKantor.calculateOperasionalKantor({
        ...defaultParam,
        aggregate,
      });
    if (groupBy)
      return OperasionalKantor.getGroupBy({
        ...defaultParam,
        groupBy,
      });
    return OperasionalKantor.get({ ...defaultParam });
  },

  async getById(id) {
    const result = await OperasionalKantor.getById(id);
    if (!result) {
      throw new Error(`Id ${NAME} not found`);
    }
    return result;
  },

  async patch(id, data) {
    if (!id) {
      throw new Error("ID is required");
    }
    const result = await OperasionalKantor.patch(id, data);
    if (result.affectedRows === 0) {
      throw new Error("No data updated");
    }
    return result;
  },

  async delete(id) {
    const result = await OperasionalKantor.delete(id);
    if (result.affectedRows === 0) {
      throw new Error(`Id ${NAME} not found`);
    }
    return result;
  },
};
export default OperasionalKantorService;
