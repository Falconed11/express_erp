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
  async listComposites(req, res, next) {
    defaultAsyncController(
      async () =>
        KeranjangProyekService.listComposites({
          id_proyek: req.params.idProyek,
          versi: req.query.versi,
          instalasi: req.query.instalasi,
        }),
      { req, res, next },
    );
  },
  async createComposite(req, res, next) {
    defaultAsyncController(
      async () =>
        KeranjangProyekService.createComposite({
          id_proyek: req.params.idProyek,
          ...req.body,
          user: req.user,
        }),
      { req, res, next },
    );
  },
  async updateComposite(req, res, next) {
    defaultAsyncController(
      async () =>
        KeranjangProyekService.updateComposite({
          id: req.params.id,
          id_proyek: req.params.idProyek,
          form: req.body,
          user: req.user,
        }),
      { req, res, next },
    );
  },
  async deleteComposite(req, res, next) {
    defaultAsyncController(
      async () =>
        KeranjangProyekService.deleteComposite({
          id: req.params.id,
          id_proyek: req.params.idProyek,
          user: req.user,
        }),
      { req, res, next },
    );
  },
  async reorderComposite(req, res, next) {
    defaultAsyncController(
      async () =>
        KeranjangProyekService.reorderComposite({
          id_proyek: req.params.idProyek,
          form: req.body,
          user: req.user,
        }),
      { req, res, next },
    );
  },
};
export default KeranjangProyekController;
