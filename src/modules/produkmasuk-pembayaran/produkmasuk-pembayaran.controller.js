import { defaultAsyncController } from "../../helpers/default.js";
import Service from "./produkmasuk-pembayaran.service.js";

const Controller = {
  getAll(req, res, next) {
    defaultAsyncController(
      () => Service.getAll({ ...req.query, user: req.user }),
      { req, res, next },
    );
  },
  getAvailablePurchaseJournals(req, res, next) {
    defaultAsyncController(
      () =>
        Service.getAvailablePurchaseJournals({
          id_produkmasuk: req.params.id,
          user: req.user,
        }),
      { req, res, next },
    );
  },
  generatePurchaseJournal(req, res, next) {
    defaultAsyncController(
      () =>
        Service.generatePurchaseJournal({
          id_produkmasuk: req.params.id,
          user: req.user,
        }),
      { req, res, next },
    );
  },
  linkPurchaseJournal(req, res, next) {
    defaultAsyncController(
      () =>
        Service.linkPurchaseJournal(
          {
            id_produkmasuk: req.params.id,
            id_jurnal: req.body?.id_jurnal,
          },
          req.user,
        ),
      { req, res, next },
    );
  },
  create(req, res, next) {
    defaultAsyncController(() => Service.create(req.body, req.user), {
      req,
      res,
      next,
    });
  },
  update(req, res, next) {
    defaultAsyncController(
      () => Service.update(req.params.id, req.body, req.user),
      { req, res, next },
    );
  },
  delete(req, res, next) {
    defaultAsyncController(
      () => Service.delete(req.params.id, req.body, req.user),
      { req, res, next },
    );
  },
};

export default Controller;
