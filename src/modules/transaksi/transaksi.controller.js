import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./transaksi.service.js";

const Controller = generateDefaultCRUDController(Service);

export default Controller;
