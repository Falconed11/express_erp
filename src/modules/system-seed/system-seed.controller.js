import { defaultAsyncController } from "../../helpers/default.js";
import Service from "./system-seed.service.js";

const ensureSuper = (req) => {
  if (req.user?.peran !== "super") {
    const error = new Error(
      "Hanya super admin yang dapat mengelola seed sistem.",
    );
    error.statusCode = 403;
    throw error;
  }
};

const Controller = {
  async check(req, res, next) {
    defaultAsyncController(
      async () => {
        ensureSuper(req);
        return Service.check();
      },
      { req, res, next },
    );
  },

  async apply(req, res, next) {
    defaultAsyncController(
      async () => {
        ensureSuper(req);
        return Service.apply();
      },
      { req, res, next },
    );
  },
};

export default Controller;
