import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./coa-filter.model.js";

const Service = generateDefaultCRUDService(Model);

export default Service;
