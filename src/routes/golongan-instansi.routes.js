import { Router } from "express";
import GolonganInstansiController from "../controllers/jenis-proyek.controller.js";

const router = Router();

router.post("/", GolonganInstansiController.create);
router.get("/", GolonganInstansiController.getAll);
router.patch("/:id", GolonganInstansiController.patch);
router.delete("/:id", GolonganInstansiController.delete);

export default router;
