import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "vendor_jenis";

const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
});

export default Model;
