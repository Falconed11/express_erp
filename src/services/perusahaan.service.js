import { getAll } from "../models/default.model.js";
import { withTransaction } from "../helpers/transaction.js";
import OperasionalKantorService from "./operasional-kantor.service.js";
import PembayaranProyekService from "./pembayaran-proyek.service.js";
import PengeluaranProyekService from "./pengeluaran-proyek.service.js";
import TransferBankService from "./transfer-bank.service.js";

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
      const preparedParamModal = {
        id_perusahaan_tujuan: idPerusahaan,
        exclude_id_perusahaan_asal: idPerusahaan,
      };
      const preparedParamPrive = {
        id_perusahaan_asal: idPerusahaan,
        exclude_id_perusahaan_tujuan: idPerusahaan,
      };
      const [
        pembayaranResult,
        pengeluaranResult,
        operasionalResult,
        awalPembayaranResult,
        awalPengeluaranResult,
        awalOperasionalResult,
        awalModalResult,
        penambahanModalResult,
        awalPriveResult,
        priveResult,
      ] = await Promise.all([
        PembayaranProyekService.get(preparedParam),
        PengeluaranProyekService.get(preparedParam),
        OperasionalKantorService.getAll(preparedParam),
        PembayaranProyekService.get(preparedParamAwal),
        PengeluaranProyekService.get(preparedParamAwal),
        OperasionalKantorService.getAll(preparedParamAwal),
        TransferBankService.getAll({
          ...preparedParamAwal,
          ...preparedParamModal,
        }),
        TransferBankService.getAll({
          ...preparedParam,
          ...preparedParamModal,
        }),
        TransferBankService.getAll({
          ...preparedParamAwal,
          ...preparedParamPrive,
        }),
        TransferBankService.getAll({
          ...preparedParam,
          ...preparedParamPrive,
        }),
      ]);
      const getVal = (val) => +val || 0;
      const totalPembayaran = getVal(pembayaranResult.totalValue);
      const totalPengeluaran = getVal(pengeluaranResult.totalValue);
      const totalOperasional = getVal(operasionalResult.pengeluaran);
      const totalAwalPembayaran = getVal(awalPembayaranResult.totalValue);
      const totalAwalPengeluaran = getVal(awalPengeluaranResult.totalValue);
      const totalAwalOperasional = getVal(awalOperasionalResult.pengeluaran);
      const modalAwal = getVal(awalModalResult.totalValue);
      const penambahanModal = getVal(penambahanModalResult.totalValue);
      const priveAwal = getVal(awalPriveResult.totalValue);
      const prive = getVal(priveResult.totalValue);

      const labaRugi = totalPembayaran - (totalPengeluaran + totalOperasional);
      const totalPenambahan = labaRugi + penambahanModal;
      const totalPengurangan = prive;
      const saldoAwal =
        totalAwalPembayaran +
        modalAwal -
        (totalAwalPengeluaran + totalAwalOperasional + priveAwal);
      const totalPerubahan = totalPenambahan - totalPengurangan;
      const saldoAkhir = saldoAwal + totalPenambahan - totalPengurangan;
      return {
        saldoAwal,
        modalAwal,
        labaRugi,
        penambahanModal,
        totalPenambahan,
        prive,
        totalPengurangan,
        totalPerubahan,
        saldoAkhir,
      };
    });
  },
};

export default PerusahaanService;
