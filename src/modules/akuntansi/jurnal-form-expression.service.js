import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./jurnal-form-expression.model.js";

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {},
});

export default Service;
