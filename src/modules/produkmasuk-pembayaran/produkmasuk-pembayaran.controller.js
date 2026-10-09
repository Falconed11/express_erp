import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./produkmasuk-pembayaran.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  disableNama: true,
});

export default Controller;
