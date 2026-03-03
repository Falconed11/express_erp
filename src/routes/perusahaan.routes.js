import { Router } from "express";
import PerusahaanController from "../controllers/perusahaan.controller.js";

const router = Router();

// router.post("/", PembayaranProyekController.create);
router.get("/", PerusahaanController.get);
router.get("/:idPerusahaan/reports", PerusahaanController.getMonthlyReport);
// router.patch("/:id", PembayaranProyekController.patch);
// router.delete("/:id", PembayaranProyekController.delete);

export default router;
