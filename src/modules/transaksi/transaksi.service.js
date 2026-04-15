import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./transaksi.model.js";

const Service = generateDefaultCRUDService(Model);

export default Service;
