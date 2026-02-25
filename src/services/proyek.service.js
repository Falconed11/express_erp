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
  async calculatePengeluaranById(param) {
    return ProyekModel.calculatePengeluaranById(param);
  },
  async calculatePembayaranById(param) {
    return ProyekModel.calculatePembayaranById(param);
  },
  async getMonthlyReport(param) {
    const rows = await ProyekModel.getMonthlyReport(param);
    const proyekMap = {};

    rows.forEach((r) => {
      if (!proyekMap[r.id]) {
        proyekMap[r.id] = {
          id_second: r.id_second,
          nama: r.nama,
          jeniproyek: r.jeniproyek,
          swasta: r.swasta,
          totalpengeluaran: r.totalpengeluaran,
          totalpembayaran: r.totalpembayaran,
          profit: r.profit,
          bank: r.bank,
          pembayaran: [],
        };
      }

      if (r.nominal) {
        proyekMap[r.id].pembayaran.push({
          id: r.id_pembayaran,
          nominal: r.nominal,
          tanggal: r.tanggal_bayar,
        });
      }
    });

    const result = Object.values(proyekMap);
  },
};

export default ProyekService;
