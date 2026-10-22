import { Router } from "express";
import {
  listSwitchableCompanies,
  switchCompany,
  switchRole,
} from "./role-switch.controller.js";

const router = Router();

router.get("/companies", listSwitchableCompanies);
router.post("/company", switchCompany);
router.post("/", switchRole);

export default router;
