import { Router } from "express";
import JenisInstansiController from "../controllers/jenis-instansi.controller.js";

const router = Router();

router.post("/", JenisInstansiController.create);
router.get("/", JenisInstansiController.getAll);
router.patch("/:id", JenisInstansiController.patch);
router.delete("/:id", JenisInstansiController.delete);

export default router;
