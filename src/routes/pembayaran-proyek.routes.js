import { Router } from "express";
import PembayaranProyekController from "../controllers/pembayaran-proyek.controller.js";

const router = Router();

// router.post("/", PembayaranProyekController.create);
router.get("/", PembayaranProyekController.get);
// router.patch("/:id", PembayaranProyekController.patch);
// router.delete("/:id", PembayaranProyekController.delete);

export default router;
