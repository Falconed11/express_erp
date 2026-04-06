import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa";
const extraAllowedField = ["id_coa_subtype", "id_logical"];
const Model = generateStandardCRUDModel(
  TABLE_NAME,
  extraAllowedField,
  extraAllowedField,
  {
    customSelect: "ct.nama coa_type, cs.nama coa_subtype",
    generateCustomJoin: (mainTable) => `
      left join coa_subtype cs on cs.id=${mainTable}.id_coa_subtype
      left join coa_type ct on ct.id=cs.id_coa_type
    `,
  },
);

export default Model;
