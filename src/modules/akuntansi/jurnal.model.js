import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "jurnal";
const extraAllowedFields = [
  "id_jurnal_form",
  "id_perusahaan",
  "tanggal",
  "id_proyek",
];
const Model = generateStandardCRUDModel({
  allowNoUpdate: true,
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: {
    id_perusahaan: "p.id",
    id_proyek: "pr.id",
    id_jurnal_form: "jf.id",
  },
  customSelect: "jf.nama jurnal_form",
  generateCustomJoin: (mainTable) => `
    left join perusahaan p on p.id=${mainTable}.id_perusahaan
    left join proyek pr on pr.id=${mainTable}.id_proyek
    left join jurnal_form jf on jf.id=${mainTable}.id_jurnal_form
  `,
});

export default Model;
