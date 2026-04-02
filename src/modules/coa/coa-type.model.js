import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa_type";
const Model = generateStandardCRUDModel(TABLE_NAME);

export default Model;
