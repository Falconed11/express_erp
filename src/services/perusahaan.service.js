import { getAll } from "../models/default.model.js";
import OperasionalKantorService from "./operasional-kantor.service.js";
import PembayaranProyekService from "./pembayaran-proyek.service.js";
import PengeluaranProyekService from "./pengeluaran-proyek.service.js";

const table = "perusahaan";

const PerusahaanService = {
  async get() {
    return getAll(table);
  },
  async getMonthlyReport(param) {
    const pembayaran = await PembayaranProyekService.get(param);
    const pengeluaran = await PengeluaranProyekService.get(param);
    const operasional = await OperasionalKantorService.getAll(param);
    return pembayaran - (pengeluaran + operasional);
  },
};

export default PerusahaanService;
