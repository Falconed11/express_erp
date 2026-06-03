import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./laporan-relation.service.js";

const Controller = generateDefaultCRUDController({
  disableNama: true,
  ...Service,
});

export default Controller;
