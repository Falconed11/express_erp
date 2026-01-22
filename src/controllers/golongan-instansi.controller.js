import GolonganInstansiService from "../services/golongan-instansi.service.js";
import { successResponse } from "../utils/response.js";

const NAME = "Golongan Instansi";

const GolonganInstansiController = {
  async create(req, res, next) {
    try {
      const result = await GolonganInstansiService.create(req.body);
      successResponse(res, result, `${NAME} created`, 201);
    } catch (err) {
      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const data = await GolonganInstansiService.getAll(req.query);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await GolonganInstansiService.getById(req.params.id);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async patch(req, res, next) {
    try {
      const result = await GolonganInstansiService.patch(
        req.params.id,
        req.body,
      );
      successResponse(res, result, `${NAME} updated`);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const result = await GolonganInstansiService.delete(req.params.id);
      successResponse(res, result, `${NAME} deleted`);
    } catch (err) {
      next(err);
    }
  },
};
export default GolonganInstansiController;
