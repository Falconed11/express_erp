import { Router } from "express";
import * as Controller from "./device-monitor.controller.js";

const router = Router();

router.get("/", Controller.list);
router.post("/heartbeat", Controller.heartbeat);

export default router;
