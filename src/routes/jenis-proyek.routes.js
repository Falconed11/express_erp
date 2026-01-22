import { Router } from "express";
import JenisProyekController from "../controllers/jenis-proyek.controller.js";

const router = Router();

router.post("/", JenisProyekController.create);
router.get("/", JenisProyekController.getAll);
router.patch("/:id", JenisProyekController.patch);
router.delete("/:id", JenisProyekController.delete);

export default router;
