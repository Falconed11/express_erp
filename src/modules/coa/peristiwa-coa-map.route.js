import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./peristiwa-coa-map.controller.js";

const router = generateDefaultCRUDRouter(Controller);

export default router;
