import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./peristiwa.service.js";

const Controller = generateDefaultCRUDController(Service);

export default Controller;
