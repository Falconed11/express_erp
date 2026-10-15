import { Router } from "express";
import Controller from "./produkmasuk-pembayaran.controller.js";

const router = Router();
router.get("/", Controller.getAll);
router.get(
  "/:id/available-purchase-journals",
  Controller.getAvailablePurchaseJournals,
);
router.post("/:id/link-purchase-journal", Controller.linkPurchaseJournal);
router.post(
  "/:id/generate-purchase-journal",
  Controller.generatePurchaseJournal,
);
router.post("/", Controller.create);
router.patch("/:id", Controller.update);
router.delete("/:id", Controller.delete);

export default router;
