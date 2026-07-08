import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./jurnal-form.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  customController: {},
});

export default Controller;
