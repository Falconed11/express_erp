import { Router } from "express";
import Controller from "./produk-keluar.controller.js";

const router = Router();

router.post("/", Controller.create);

export default router;
