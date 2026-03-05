import { defaultCalculateFilterByIdPerusahaanService } from "../helpers/default.js";
import PembayaranProyekModel from "../models/pembayaran-proyek.model.js";

const table = "pembayaranproyek";

const PembayaranProyekService = {
  async get({ proyek, ...rest }) {
    if (proyek) return PembayaranProyekModel.find({ proyek });
    return defaultCalculateFilterByIdPerusahaanService({
      ...rest,
      columnName: "nominal",
      allowedAggregate: ["sum"],
      table,
    });
  },
};
export default PembayaranProyekService;
