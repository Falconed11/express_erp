import { defaultAsyncController } from "../../helpers/default.js";
import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./coa-role-visibility.service.js";

const canManage = (req) => ["owner", "super"].includes(req.user?.peran);
const deny = (res) =>
  res.status(403).json({
    success: false,
    message: "Hanya owner atau super yang dapat mengatur visibilitas COA.",
  });

const Controller = generateDefaultCRUDController({
  ...Service,
  disableNama: true,
  customController: {
    async getAll(req, res, next) {
      if (!canManage(req)) return deny(res);
      return generateDefaultCRUDController({ ...Service }).getAll(
        req,
        res,
        next,
      );
    },
    async create(req, res, next) {
      if (!canManage(req)) return deny(res);
      return defaultAsyncController(
        () => Service.create({ ...req.body, created_by: req.user.id_karyawan }),
        { req, res, next },
      );
    },
    async patch(req, res, next) {
      if (!canManage(req)) return deny(res);
      return defaultAsyncController(
        () =>
          Service.patch(req.params.id, {
            ...req.body,
            updated_by: req.user.id_karyawan,
          }),
        { req, res, next },
      );
    },
    async destroy(req, res, next) {
      if (!canManage(req)) return deny(res);
      return defaultAsyncController(() => Service.destroy(req.params.id), {
        req,
        res,
        next,
      });
    },
  },
});

export default Controller;
