import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./peristiwa-coa-map.model.js";

const Service = generateDefaultCRUDService(Model);

export default Service;
