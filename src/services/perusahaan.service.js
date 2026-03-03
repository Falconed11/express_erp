import { getAll } from "../models/default.model.js";
import { withTransaction } from "../helpers/transaction.js";
import OperasionalKantorService from "./operasional-kantor.service.js";
import PembayaranProyekService from "./pembayaran-proyek.service.js";
import PengeluaranProyekService from "./pengeluaran-proyek.service.js";

const table = "perusahaan";

const PerusahaanService = {
  async get() {
    return getAll(table);
  },
  async getMonthlyReport(param) {
    return withTransaction(async (conn) => {
      const preparedParam = { ...param, conn, aggregate: "sum" };
      const [pembayaran, pengeluaran, operasional] = await Promise.all([
        PembayaranProyekService.get(preparedParam),
        PengeluaranProyekService.get(preparedParam),
        OperasionalKantorService.getAll(preparedParam),
      ]);
      const totalPembayaran = +pembayaran.totalValue || 0;
      const totalPengeluaran = +pengeluaran.totalValue || 0;
      const totalOperasional = +operasional.pengeluaran || 0;
      console.log({ totalOperasional, totalPembayaran, totalPengeluaran });
      return {
        labarugi: totalPembayaran - (totalPengeluaran + totalOperasional),
      };
    });
  },
};

export default PerusahaanService;
