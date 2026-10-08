import { Router } from "express";
import Controller from "./produk-stock.controller.js";

const router = Router();

router.post("/entries", Controller.createEntry);
router.post("/entries/:id/claim", Controller.claimEntry);
router.get("/loans", Controller.listLoans);
router.get("/unclaimed-entries", Controller.listUnclaimedEntries);

export default router;
