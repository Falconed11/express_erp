import { defaultCalculateFilterByIdPerusahaanService } from "../helpers/default.js";

const table = "pembayaranproyek";

const PembayaranProyekService = {
  async get({ periode, aggregate, idPerusahaan }) {
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
