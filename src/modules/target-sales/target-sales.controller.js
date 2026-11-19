import { defaultAsyncController } from "../../helpers/default.js";

export const createTargetSalesController = (service) => ({
  list(req, res, next) {
    defaultAsyncController(
      async () => service.list({ ...req.query, user: req.user }),
      { req, res, next },
    );
  },

  summary(req, res, next) {
    defaultAsyncController(
      async () => service.summary({ ...req.query, user: req.user }),
      { req, res, next },
    );
  },

  create(req, res, next) {
    defaultAsyncController(
      async () =>
        service.create(
          req.body ?? {},
          req.user ?? {},
        ),
      { req, res, next },
    );
  },

  update(req, res, next) {
    defaultAsyncController(
      async () =>
        service.update(
          req.params.id,
          req.body ?? {},
          req.user ?? {},
        ),
      { req, res, next },
    );
  },

  deleteMany(req, res, next) {
    defaultAsyncController(
      async () => service.deleteMany(req.body ?? {}, req.user ?? {}),
      { req, res, next },
    );
  },
});
