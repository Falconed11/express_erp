import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./jurnal-expression.controller.js";

const router = generateDefaultCRUDRouter(Controller);

export default router;
