import { calculateService } from "./default.service.js";

const table = "pembayaranproyek";

const PembayaranProyekService = {
  async get({ periode, aggregate }) {
    return calculateService({
      periode,
      aggregate,
      columnName: "nominal",
      allowedAggregate: ["sum"],
      table,
    });
  },
};
export default PembayaranProyekService;
