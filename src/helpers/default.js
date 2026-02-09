import { successResponse } from "../utils/response.js";

export const defaultAsyncController = async (serviceFn, { req, res, next }) => {
  try {
    const data = await serviceFn(req);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};
