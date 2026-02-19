import { Router } from "express";
import KeranjangProyekController from "../controllers/keranjang-proyek.controller.js";

const router = Router();

// router.post("/", KeranjangProyekController.create);
// router.get("/", KeranjangProyekController.get);
router.get("/:idProyek/summary", KeranjangProyekController.getOfferingSummary);
// router.patch("/:id", KeranjangProyekController.patch);
// router.delete("/:id", KeranjangProyekController.delete);

export default router;
