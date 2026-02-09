import { Router } from "express";
import PengeluaranProyekController from "../controllers/pengeluaran-proyek.controller.js";

const router = Router();

// router.post("/", PengeluaranProyekController.create);
router.get("/", PengeluaranProyekController.get);
// router.patch("/:id", PengeluaranProyekController.patch);
// router.delete("/:id", PengeluaranProyekController.delete);

export default router;
