import { defaultCalculateFilterByIdPerusahaanService } from "../helpers/default.js";
import PengeluaranProyekModel from "../models/pengeluaran-proyek.model.js";

const table = "pengeluaranproyek";

const PengeluaranProyekService = {
  async get({ periode, aggregate, idPerusahaan, idProyek, ...rest }) {
    if (idProyek) return PengeluaranProyekModel.find({ idProyek });
    return defaultCalculateFilterByIdPerusahaanService({
      ...rest,
      periode,
      aggregate,
      columnName: "jumlah*harga",
      allowedAggregate: ["sum"],
      table,
      idPerusahaan,
    });
  },
};
export default PengeluaranProyekService;
