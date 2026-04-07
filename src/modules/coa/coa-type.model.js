import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa_type";
const extraAllowedFields = ["id_coa_subtype"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  allowedFieldsForFilter: ["aktif"],
});

export default Model;
