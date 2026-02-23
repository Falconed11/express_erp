import { defaultCalculateFilterByIdPerusahaanService } from "../helpers/default.js";
import PembayaranProyekModel from "../models/pembayaran-proyek.model.js";

const table = "pembayaranproyek";

const PembayaranProyekService = {
  async get({ periode, aggregate, idPerusahaan, proyek }) {
    if (proyek) return PembayaranProyekModel.find({ proyek });
    return defaultCalculateFilterByIdPerusahaanService({
      periode,
      aggregate,
      columnName: "nominal",
      allowedAggregate: ["sum"],
      table,
      idPerusahaan,
    });
  },
};
export default PembayaranProyekService;
