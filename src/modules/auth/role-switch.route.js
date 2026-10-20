import { Router } from "express";
import { switchRole } from "./role-switch.controller.js";

const router = Router();

router.post("/", switchRole);

export default router;
