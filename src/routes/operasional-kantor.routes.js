import { Router } from "express";
import OperasionalKantorController from "../controllers/operasional-kantor.controller.js";

const router = Router();

router.post("/", OperasionalKantorController.create);
router.get("/", OperasionalKantorController.getAll);
router.patch("/:id", OperasionalKantorController.patch);
router.delete("/:id", OperasionalKantorController.delete);

export default router;
