import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./coa-filter-map.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  disableNama: true,
});

export default Controller;
