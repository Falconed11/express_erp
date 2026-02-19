import { defaultAsyncController } from "../helpers/default.js";
import KeranjangProyekService from "../services/keranjang-proyek.service.js";

const KeranjangProyekController = {
  async getOfferingSummary(req, res, next) {
    defaultAsyncController(
      async (req) =>
        KeranjangProyekService.getOfferingSummary(req.params.idProyek),
      {
        req,
        res,
        next,
      },
    );
  },
};
export default KeranjangProyekController;
