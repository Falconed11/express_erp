import { defaultCalculateFilterByIdPerusahaanService } from "../helpers/default.js";

const table = "pengeluaranproyek";

const PengeluaranProyekService = {
  async get({ periode, aggregate, idPerusahaan }) {
    return defaultCalculateFilterByIdPerusahaanService({
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
