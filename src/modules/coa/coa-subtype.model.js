import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa_subtype";
const extraAllowedField = ["id_coa_type"];
const Model = generateStandardCRUDModel(
  TABLE_NAME,
  extraAllowedField,
  extraAllowedField,
  {
    customSelect: "ct.nama coa_type",
    generateCustomJoin: (mainTable) => `
            left join coa_type ct on ct.id=${mainTable}.id_coa_type
        `,
  },
);

export default Model;
