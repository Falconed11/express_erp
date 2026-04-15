import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "jurnal";
const extraAllowedFields = ["id_coa", "id_perusahaan"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: {
    id_coa: "c.id",
    id_perusahaan: "p.id",
  },
  customSelect: "c.nama coa, p.nama perusahaan",
  generateCustomJoin: (mainTable) => `
    left join coa c on c.id=${mainTable}.id_coa
    left join perusahaan p on p.id=${mainTable}.id_perusahaan
  `,
});

export default Model;
