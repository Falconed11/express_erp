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
      const [
        pembayaran,
        pengeluaran,
        operasional,
        awalPembayaran,
        awalPengeluaran,
        awalOperasional,
      ] = await Promise.all([
        PembayaranProyekService.get(preparedParam),
        PengeluaranProyekService.get(preparedParam),
        OperasionalKantorService.getAll(preparedParam),
        PembayaranProyekService.get(preparedParamAwal),
        PengeluaranProyekService.get(preparedParamAwal),
        OperasionalKantorService.getAll(preparedParamAwal),
      ]);
      const getVal = (val) => +val || 0;
      const totalPembayaran = getVal(pembayaran.totalValue);
      const totalPengeluaran = getVal(pengeluaran.totalValue);
      const totalOperasional = getVal(operasional.pengeluaran);
      const totalAwalPembayaran = getVal(awalPembayaran.totalValue);
      const totalAwalPengeluaran = getVal(awalPengeluaran.totalValue);
      const totalAwalOperasional = getVal(awalOperasional.pengeluaran);
      return {
        labarugi: totalPembayaran - (totalPengeluaran + totalOperasional),
        awallabarugi:
          totalAwalPembayaran - (totalAwalPengeluaran + totalAwalOperasional),
      };
    });
  },
};

export default PerusahaanService;
