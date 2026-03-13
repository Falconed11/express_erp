import { Router } from "express";
import MetodePembayaranController from "../controllers/metode-pembayaran.controller.js";

const router = Router();

// router.post("/", MetodePembayaranController.create);
// router.get("/", MetodePembayaranController.getAll);
router.patch("/:id", MetodePembayaranController.patch);
// router.delete("/:id", MetodePembayaranController.delete);

export default router;
