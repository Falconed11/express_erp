import { Router } from "express";
import * as Controller from "./live-chat.controller.js";

const router = Router();

router.get("/online", Controller.listOnlineEmployees);
router.get("/", Controller.list);
router.post("/", Controller.create);

export default router;
