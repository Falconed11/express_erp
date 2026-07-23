import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa";
const extraAllowedFields = ["id_coa_subtype", "id_logical", "id_perusahaan"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: { id_coa_type: "ct.id" },
  customSelect:
    "ct.id id_coa_type, ct.nama coa_type, cs.nama coa_subtype, p.nama perusahaan",
  generateCustomJoin: (mainTable) => `
      left join coa_subtype cs on cs.id=${mainTable}.id_coa_subtype
      left join coa_type ct on ct.id=cs.id_coa_type
      left join perusahaan p on p.id=${mainTable}.id_perusahaan
    `,
});

export default Model;
