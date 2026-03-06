import { defaultCalculateFilterByIdPerusahaanService } from "../helpers/default.js";
import PengeluaranProyekModel from "../models/pengeluaran-proyek.model.js";

const table = "pengeluaranproyek";

const PengeluaranProyekService = {
  async get({ idProyek, ...rest }) {
    if (idProyek) return PengeluaranProyekModel.find({ idProyek });
    return defaultCalculateFilterByIdPerusahaanService({
      ...rest,
      columnName: "jumlah*harga",
      allowedAggregate: ["sum"],
      table,
    });
  },
};
export default PengeluaranProyekService;
