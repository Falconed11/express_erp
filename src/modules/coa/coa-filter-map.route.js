import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./coa-filter-map.controller.js";

const router = generateDefaultCRUDRouter(Controller);

export default router;
