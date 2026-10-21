import { Router } from "express";
import * as Controller from "./keterangan-khusus-penawaran.controller.js";

const router = Router();

router.get("/", Controller.list);
router.post("/", Controller.create);
router.patch("/:id", Controller.update);
router.delete("/:id", Controller.remove);

export default router;
