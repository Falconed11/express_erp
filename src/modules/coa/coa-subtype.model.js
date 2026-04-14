import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa_subtype";
const extraAllowedFields = ["id_coa_type"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: { id_coa_type: "ct.id" },
  customSelect: "ct.nama coa_type",
  generateCustomJoin: (mainTable) => `
            left join coa_type ct on ct.id=${mainTable}.id_coa_type
        `,
});

export default Model;
