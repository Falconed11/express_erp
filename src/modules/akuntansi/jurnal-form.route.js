import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./jurnal-form.controller.js";

const router = generateDefaultCRUDRouter(Controller);

export default router;
