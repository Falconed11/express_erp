import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./vendor-jenis.model.js";

const Service = generateDefaultCRUDService(Model);

export default Service;
