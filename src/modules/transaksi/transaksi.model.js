import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "transaksi";
const extraAllowedFields = ["id_jurnal", "id_coa", "tipe", "amount"];
const Model = generateStandardCRUDModel({
  allowNoUpdate: true,
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: { id_jurnal: "j.id", id_coa: "c.id" },
  customSelect:
    "j.tanggal, j.keterangan keterangan_jurnal, c.nama coa, p.nama perusahaan, pr.id id_proyek, pr.nama proyek",
  generateCustomJoin: (
    mainTable,
  ) => `left join jurnal j on j.id=${mainTable}.id_jurnal
    left join coa c on c.id=${mainTable}.id_coa
    left join perusahaan p on p.id=j.id_perusahaan
    left join proyek pr on pr.id=j.id_proyek`,
});

export default Model;
