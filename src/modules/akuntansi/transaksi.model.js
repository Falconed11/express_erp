import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "transaksi";
const extraAllowedFields = ["id_jurnal", "id_coa", "tipe", "amount"];
const Model = generateStandardCRUDModel({
  allowNoUpdate: true,
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  generateAllowedSortFields: (mainTable) => ({
    id: `${mainTable}.id`,
    tanggal: "j.tanggal",
    keterangan_jurnal: "j.keterangan",
  }),
  filterAliases: {
    id_jurnal: "j.id",
    id_coa: "c.id",
    id_perusahaan: "p.id",
    id_proyek: "pr.id",
    id_instansi: "i.id",
    jurnal: "j.keterangan",
  },
  customSelect:
    "j.tanggal, j.keterangan keterangan_jurnal, c.nama coa, p.nama perusahaan, pr.id id_proyek, pr.nama proyek, i.nama instansi",
  generateCustomJoin: (
    mainTable,
  ) => `left join jurnal j on j.id=${mainTable}.id_jurnal
    left join coa c on c.id=${mainTable}.id_coa
    left join perusahaan p on p.id=j.id_perusahaan
    left join proyek pr on pr.id=j.id_proyek
    left join instansi i on i.id=pr.id_instansi`,
  generateOrderBy: (mainTable) =>
    `ORDER BY j.tanggal DESC, ${mainTable}.id DESC`,
});

export default Model;
