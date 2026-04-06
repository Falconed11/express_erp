import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./coa-subtype.service.js";

const Controller = generateDefaultCRUDController(Service);

export default Controller;
