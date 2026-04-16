import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "transaksi";
const extraAllowedFields = ["id_jurnal", "id_coa", "tipe", "amount"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: { id_jurnal: "j.id", id_coa: "c.id" },
  customSelect: "j.tanggal, c.nama coa, p.nama perusahaan",
  generateCustomJoin: (
    mainTable,
  ) => `left join jurnal j on j.id=${mainTable}.id_jurnal
    left join coa c on c.id=${mainTable}.id_coa
    left join perusahaan p on p.id=j.id_perusahaan`,
});

export default Model;
