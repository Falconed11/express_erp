import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./peristiwa.model.js";

const Service = generateDefaultCRUDService(Model);

export default Service;
