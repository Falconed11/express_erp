import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./laporan.controller.js";

const router = generateDefaultCRUDRouter(Controller);
router.get("/:id/coas", Controller.getCoasWithoutValue);
router.patch("/:id/node-default-open", Controller.setNodeDefaultOpen);
router.patch("/:id/node-order", Controller.setNodeOrder);

export default router;
