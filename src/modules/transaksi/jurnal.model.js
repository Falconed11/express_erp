import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "jurnal";
const extraAllowedFields = ["id_perusahaan", "tanggal"];
const Model = generateStandardCRUDModel({
  allowNoUpdate: true,
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: {
    id_perusahaan: "p.id",
  },
  customSelect: "c.nama coa",
  generateCustomJoin: (mainTable) => `
    left join perusahaan p on p.id=${mainTable}.id_perusahaan
  `,
});

export default Model;
