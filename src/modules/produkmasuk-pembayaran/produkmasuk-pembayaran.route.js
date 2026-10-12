import { Router } from "express";
import Controller from "./produkmasuk-pembayaran.controller.js";

const router = Router();
router.get("/", Controller.getAll);
router.post("/", Controller.create);
router.patch("/:id", Controller.update);
router.delete("/:id", Controller.delete);

export default router;
