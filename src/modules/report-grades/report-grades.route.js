import { Router } from "express";
import { createReportGradesController } from "./report-grades.controller.js";
import { createReportGradesModel } from "./report-grades.model.js";
import { createReportGradesService } from "./report-grades.service.js";

export const createReportGradesRouter = () => {
  const router = Router();
  const model = createReportGradesModel();
  const service = createReportGradesService(model);
  const controller = createReportGradesController(service);

  router.get("/", controller.list);
  router.put("/:panel", controller.replacePanel);
  return router;
};
