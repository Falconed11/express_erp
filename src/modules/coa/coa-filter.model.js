import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa_filter";
const extraAllowedFields = ["id_coa", "id_coa_type", "id_coa_subtype"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  extraAllowedFieldsForFilter: extraAllowedFields,
  customSelect: "c.nama coa, ct.nama coa_type, cs.nama coa_subtype",
  generateCustomJoin: (mainTable) => `
    left join coa c on c.id=${mainTable}.id_coa
    left join coa_type ct on ct.id=${mainTable}.id_coa_type
    left join coa_subtype cs on cs.id=${mainTable}.id_coa_subtype
  `,
});

export default Model;
