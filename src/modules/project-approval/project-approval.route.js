import { Router } from "express";
import * as Controller from "./project-approval.controller.js";

const router = Router();

router.get("/", Controller.getStatus);
router.post("/", Controller.approve);
router.delete("/", Controller.cancel);

export default router;
