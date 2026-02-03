import OperasionalKantorService from "../services/operasional-kantor.service.js";
import { successResponse } from "../utils/response.js";

const NAME = "Golongan Instansi";

const OperasionalKantorController = {
  async create(req, res, next) {
    try {
      const result = await OperasionalKantorService.create(req.body);
      successResponse(res, result, `${NAME} created`, 201);
    } catch (err) {
      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const data = await OperasionalKantorService.getAll(req.query);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await OperasionalKantorService.getById(req.params.id);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async patch(req, res, next) {
    try {
      const result = await OperasionalKantorService.patch(
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
      const result = await OperasionalKantorService.delete(req.params.id);
      successResponse(res, result, `${NAME} deleted`);
    } catch (err) {
      next(err);
    }
  },
};
export default OperasionalKantorController;
