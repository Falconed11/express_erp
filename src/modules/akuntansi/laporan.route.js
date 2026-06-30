import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./laporan.controller.js";

const router = generateDefaultCRUDRouter(Controller);
router.get("/:id/coas", Controller.getCoasWithoutValue);

export default router;
