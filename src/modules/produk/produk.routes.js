import { Router } from "express";
import Controller from "./produk.controller.js";

const router = Router();

router.get("/", Controller.getAll);
router.post("/", Controller.create);
router.get("/kategori", Controller.getKategori);
router.post("/transfer", Controller.transfer);
router.get("/:id", Controller.getById);
router.patch("/:id", Controller.patch);
router.delete("/:id", Controller.destroy);

export default router;
