import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./app-config.controller.js";

const router = generateDefaultCRUDRouter(Controller);

export default router;
