import JenisInstansiService from "../services/jenis-instansi.service.js";
import { successResponse } from "../utils/response.js";

const NAME = "Jenis Instansi";

const JenisInstansiController = {
  async create(req, res, next) {
    try {
      const result = await JenisInstansiService.create(req.body);
      successResponse(res, result, `${NAME} created`, 201);
    } catch (err) {
      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const data = await JenisInstansiService.getAll(req.query);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await JenisInstansiService.getById(req.params.id);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async patch(req, res, next) {
    try {
      const result = await JenisInstansiService.patch(req.params.id, req.body);
      successResponse(res, result, `${NAME} updated`);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const result = await JenisInstansiService.delete(req.params.id);
      successResponse(res, result, `${NAME} deleted`);
    } catch (err) {
      next(err);
    }
  },
};
export default JenisInstansiController;
