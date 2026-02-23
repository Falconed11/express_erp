import { Router } from "express";
import ProyekController from "../controllers/proyek.controller.js";

const router = Router();

router.get("/", ProyekController.get);
// router.get('/:id', ProyekController.getUserById);
// router.post('/', ProyekController.createUser);
// router.put('/:id', ProyekController.updateUser);
// router.delete('/:id', ProyekController.deleteUser);

router.get("/:id/pembayaran", ProyekController.calculatePembayaranById);
router.get("/:id/pengeluaran", ProyekController.calculatePengeluaranById);
router.get("/:id/produkmenunggu", ProyekController.getStagedProductByProjectId);

export default router;
