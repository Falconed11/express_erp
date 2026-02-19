import KeranjangProyekModel from "../models/keranjang-proyek.model.js";

const table = "pengeluaranproyek";

const KeranjangProyekService = {
  async getOfferingSummary(idProyek) {
    return KeranjangProyekModel.getOfferingSummary(idProyek);
  },
};
export default KeranjangProyekService;
