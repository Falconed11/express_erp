import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./vendor-jenis.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
});

export default Controller;
