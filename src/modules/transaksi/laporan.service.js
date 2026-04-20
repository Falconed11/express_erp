import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./laporan.model.js";

const Service = generateDefaultCRUDService(Model);

export default Service;
