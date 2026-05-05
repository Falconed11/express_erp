import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./vendor-jenis.controller.js";

const router = generateDefaultCRUDRouter(Controller);

export default router;
