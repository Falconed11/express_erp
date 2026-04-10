import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./peristiwa.controller.js";

const router = generateDefaultCRUDRouter(Controller);

export default router;
