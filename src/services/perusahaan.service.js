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
    const { from, to, idPerusahaan } = param;
    const aggregate = "sum";
    return withTransaction(async (conn) => {
      const preparedParam = { ...param, conn, aggregate };
      const preparedParamAwal = { to: from, aggregate, conn, idPerusahaan };
      const [pembayaran, pengeluaran, operasional, awalPembayaran] =
        await Promise.all([
          PembayaranProyekService.get(preparedParam),
          PengeluaranProyekService.get(preparedParam),
          OperasionalKantorService.getAll(preparedParam),
          PembayaranProyekService.get(preparedParamAwal),
        ]);
      const totalPembayaran = +pembayaran.totalValue || 0;
      const totalPengeluaran = +pengeluaran.totalValue || 0;
      const totalOperasional = +operasional.pengeluaran || 0;
      const totalAwalPembayaran = +awalPembayaran.totalValue || 0;
      return {
        labarugi: totalPembayaran - (totalPengeluaran + totalOperasional),
        awallabarugi: totalAwalPembayaran,
      };
    });
  },
};

export default PerusahaanService;
