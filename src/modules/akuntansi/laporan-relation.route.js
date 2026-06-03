import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./laporan-relation.controller.js";

const router = generateDefaultCRUDRouter(Controller);

export default router;
