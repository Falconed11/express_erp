import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./jurnal.model.js";

const Service = generateDefaultCRUDService(Model);

export default Service;
