import { Router } from "express";
import TransferBankController from "../controllers/transfer-bank.controller.js";

const router = Router();

router.post("/", TransferBankController.create);
router.get("/", TransferBankController.getAll);
router.patch("/:id", TransferBankController.patch);
router.delete("/:id", TransferBankController.delete);

export default router;
