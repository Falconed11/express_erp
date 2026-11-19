import { Router } from "express";
import { createTargetSalesController } from "./target-sales.controller.js";
import { createTargetSalesModel } from "./target-sales.model.js";
import { createTargetSalesService } from "./target-sales.service.js";

export const createTargetSalesRouter = ({ tableName, isVisitTarget }) => {
  const router = Router();
  const model = createTargetSalesModel(tableName, { isVisitTarget });
  const service = createTargetSalesService(model, { isVisitTarget });
  const controller = createTargetSalesController(service);

  router.get("/summary", controller.summary);
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/", controller.deleteMany);
  return router;
};
