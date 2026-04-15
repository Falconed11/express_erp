import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./transaksi.controller.js";

const router = generateDefaultCRUDRouter(Controller);

export default router;
