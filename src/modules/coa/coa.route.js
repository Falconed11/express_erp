import { generateDefaultCRUDRouter } from "../default/default.route.js";
import Controller from "./coa.controller.js";

const router = generateDefaultCRUDRouter(Controller);
router.get("/monthly-report/:id_coa/:year/:month", Controller.getMonthlyReport);
router.get("/balances/:id_perusahaan", Controller.getBalances);

export default router;
