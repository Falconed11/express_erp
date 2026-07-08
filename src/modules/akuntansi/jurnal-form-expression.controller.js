import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./jurnal-form-expression.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  disableNama: true,
  customController: {},
});

export default Controller;
