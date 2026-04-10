import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "peristiwa";
const extraAllowedFields = [];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
});

export default Model;
