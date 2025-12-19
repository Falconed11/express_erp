import { Router } from "express";
import * as controller from "../controllers/proyek.controller.js";

const router = Router();

router.get("/", controller.getAllUsers);
// router.get('/:id', controller.getUserById);
// router.post('/', controller.createUser);
// router.put('/:id', controller.updateUser);
// router.delete('/:id', controller.deleteUser);

router.get("/:id/produkmenunggu", controller.getStagedProductByProjectId);

export default router;
