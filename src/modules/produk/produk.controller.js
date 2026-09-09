import { defaultAsyncController } from "../../helpers/default.js";
import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./produk.service.js";

const canViewAuditLog = (req) => ["owner", "super"].includes(req.user?.peran);

const Controller = generateDefaultCRUDController({
  ...Service,
  disableNama: true,
  customController: {
    async getKategori(req, res, next) {
      defaultAsyncController(async () => Service.listKategori(), {
        req,
        res,
        next,
      });
    },

    async getCandidates(req, res, next) {
      defaultAsyncController(async () => Service.getCandidates(req.query), {
        req,
        res,
        next,
      });
    },

    async getAuditLogs(req, res, next) {
      if (!canViewAuditLog(req)) {
        return res.status(403).json({
          success: false,
          message: "Hanya owner atau super yang dapat melihat riwayat produk.",
        });
      }

      defaultAsyncController(async () => Service.getAuditLogs(req.query), {
        req,
        res,
        next,
      });
    },

    async transfer(req, res, next) {
      defaultAsyncController(async () => Service.transfer(req.body), {
        req,
        res,
        next,
      });
    },

    async patch(req, res, next) {
      if (!req.body) req.body = {};
      req.body.updated_by =
        req.user?.id_karyawan ?? req.body.updated_by ?? null;
      return generateDefaultCRUDController({ ...Service }).patch(
        req,
        res,
        next,
      );
    },

    async destroy(req, res, next) {
      defaultAsyncController(
        async () =>
          Service.destroy(req.params.id, req.user?.id_karyawan ?? null),
        { req, res, next },
      );
    },
  },
});

export default Controller;
