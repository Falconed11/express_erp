import { defaultAsyncController } from "../../helpers/default.js";
import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./produk.service.js";

const canViewAuditLog = (req) => ["owner", "super"].includes(req.user?.peran);
const canCleanStock = (req) => ["owner", "super"].includes(req.user?.peran);
const canViewHargaBatas = (req) =>
  ["owner", "super"].includes(req.user?.peran) ||
  (req.user?.rank != null &&
    Number.isFinite(Number(req.user.rank)) &&
    Number(req.user.rank) <= 20);

const hideHargaBatas = (data, req) => {
  if (canViewHargaBatas(req) || data == null) return data;
  if (Array.isArray(data)) return data.map((item) => hideHargaBatas(item, req));
  if (Array.isArray(data.items)) {
    return {
      ...data,
      items: data.items.map((item) => hideHargaBatas(item, req)),
    };
  }
  const { hargabatas, ...visibleData } = data;
  return visibleData;
};

const Controller = generateDefaultCRUDController({
  ...Service,
  disableNama: true,
  customController: {
    async create(req, res, next) {
      defaultAsyncController(
        async () => {
          const data = { ...req.body };
          if (!canViewHargaBatas(req)) delete data.hargabatas;
          if (data.hargabatas === "") data.hargabatas = null;
          return Service.create(data);
        },
        { req, res, next },
      );
    },
    async getAll(req, res, next) {
      defaultAsyncController(
        async () => hideHargaBatas(await Service.getAll(req.query), req),
        { req, res, next },
      );
    },
    async getById(req, res, next) {
      defaultAsyncController(
        async () =>
          hideHargaBatas(await Service.getById(req.params.id), req),
        { req, res, next },
      );
    },
    async getStockCount(req, res, next) {
      defaultAsyncController(async () => Service.getStockCount(), {
        req,
        res,
        next,
      });
    },
    async getStockEntriesForExport(req, res, next) {
      defaultAsyncController(async () => Service.getStockEntriesForExport(), {
        req,
        res,
        next,
      });
    },
    async getPage(req, res, next) {
      defaultAsyncController(
        async () => hideHargaBatas(await Service.getPage(req.query), req),
        { req, res, next },
      );
    },
    async cleanStock(req, res, next) {
      if (!canCleanStock(req)) {
        return res.status(403).json({
          success: false,
          message: "Hanya owner atau super yang dapat membersihkan stok.",
        });
      }

      defaultAsyncController(async () => Service.cleanStock(), {
        req,
        res,
        next,
      });
    },

    async getKategori(req, res, next) {
      defaultAsyncController(async () => Service.listKategori(), {
        req,
        res,
        next,
      });
    },

    async getCandidates(req, res, next) {
      defaultAsyncController(
        async () =>
          hideHargaBatas(await Service.getCandidates(req.query), req),
        { req, res, next },
      );
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
      if (!canViewHargaBatas(req)) delete req.body.hargabatas;
      if (req.body.hargabatas === "") req.body.hargabatas = null;
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
