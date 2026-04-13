import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa_subtype";
const extraAllowedFields = ["id_coa_type"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  extraAllowedFieldsForFilter: ["id_coa_type"],
  customSelect: "ct.nama coa_type",
  generateCustomJoin: (mainTable) => `
            left join coa_type ct on ct.id=${mainTable}.id_coa_type
        `,
});

export default Model;
