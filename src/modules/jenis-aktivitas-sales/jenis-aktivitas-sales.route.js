import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./jenis-aktivitas-sales.controller.js";

const router = generateDefaultCRUDRouter(Controller);
router.post("/:id/transfer", Controller.transfer);

export default router;
