import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./laporan-relation.model.js";

const Service = generateDefaultCRUDService(Model);

export default Service;
