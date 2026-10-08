import { defaultAsyncController } from "../../helpers/default.js";
import Service from "./produk-stock.service.js";

const Controller = {
  createEntry(req, res, next) {
    defaultAsyncController(
      () => Service.createEntry(req.body, req.user),
      { req, res, next },
    );
  },
  claimEntry(req, res, next) {
    defaultAsyncController(
      () => Service.claimEntry(req.params.id, req.user),
      { req, res, next },
    );
  },
  listLoans(req, res, next) {
    defaultAsyncController(() => Service.listLoans(req.user), {
      req,
      res,
      next,
    });
  },
  returnLoan(req, res, next) {
    defaultAsyncController(
      () => Service.returnLoan(req.params.id, req.body, req.user),
      { req, res, next },
    );
  },
  revertReturn(req, res, next) {
    defaultAsyncController(
      () => Service.revertReturn(req.params.id, req.user),
      { req, res, next },
    );
  },
  listUnclaimedEntries(req, res, next) {
    defaultAsyncController(
      () => Service.listUnclaimedEntries(req.query, req.user),
      { req, res, next },
    );
  },
};

export default Controller;
