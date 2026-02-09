import { calculateService } from "./default.service.js";

const table = "pengeluaranproyek";

const PengeluaranProyekService = {
  async get({ periode, aggregate }) {
    return calculateService({
      periode,
      aggregate,
      columnName: "jumlah*harga",
      allowedAggregate: ["sum"],
      table,
    });
  },
};
export default PengeluaranProyekService;
