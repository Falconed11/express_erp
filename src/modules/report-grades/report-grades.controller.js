import { defaultAsyncController } from "../../helpers/default.js";

export const createReportGradesController = (service) => ({
  list(req, res, next) {
    defaultAsyncController(() => service.list(req.user), { req, res, next });
  },

  replacePanel(req, res, next) {
    defaultAsyncController(
      () =>
        service.replacePanel(
          req.params.panel,
          req.body?.grades,
          req.user,
        ),
      { req, res, next },
    );
  },
});
