import { Router } from "express";
import Controller from "./system-seed.controller.js";

const router = Router();

router.get("/check", Controller.check);
router.post("/apply", Controller.apply);

export default router;
