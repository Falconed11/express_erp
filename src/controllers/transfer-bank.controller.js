import TransferBankService from "../services/transfer-bank.service.js";
import { successResponse } from "../utils/response.js";

const NAME = "Transfer Bank";

const TransferBankController = {
  async create(req, res, next) {
    try {
      const result = await TransferBankService.create(req.body);
      successResponse(res, result, `${NAME} created`, 201);
    } catch (err) {
      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const data = await TransferBankService.getAll(req.query);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await TransferBankService.getById(req.params.id);
      successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async patch(req, res, next) {
    try {
      const result = await TransferBankService.patch(req.params.id, req.body);
      successResponse(res, result, `${NAME} updated`);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const result = await TransferBankService.delete(req.params.id);
      successResponse(res, result, `${NAME} deleted`);
    } catch (err) {
      next(err);
    }
  },
};
export default TransferBankController;
