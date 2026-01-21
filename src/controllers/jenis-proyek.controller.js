import { JenisProyekService } from "../services/jenis-proyek.service.js";
import { successResponse } from "../utils/response.js";

export const JenisProyekController = {
  async create(req, res, next) {
    try {
      const result = await JenisProyekService.create(req.body);
      successResponse(res, result, "Jenis proyek created", 201);
    } catch (err) {
      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const data = await JenisProyekService.getAll(req.params);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await JenisProyekService.getById(req.params.id);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async patch(req, res, next) {
    try {
      const result = await JenisProyekService.patch(req.params.id, req.body);
      successResponse(res, result, "Jenis proyek updated");
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const result = await JenisProyekService.delete(req.params.id);
      successResponse(res, result, "Jenis proyek deleted");
    } catch (err) {
      next(err);
    }
  },
};
