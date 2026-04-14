import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa_filter";
const extraAllowedFields = [];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: {},
  customSelect: "",
  generateCustomJoin: (mainTable) => ``,
});

export default Model;
