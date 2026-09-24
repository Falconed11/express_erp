import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "coa";
const extraAllowedFields = ["id_coa_subtype", "id_logical", "id_perusahaan"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: { id_coa_type: "ct.id", coa_subtype: "cs.nama" },
  customSelect:
    "ct.id id_coa_type, ct.normal_balance, ct.nama coa_type, cs.nama coa_subtype, p.nama perusahaan",
  generateCustomFilter: (filters) => {
    if (!filters.unconnected) return null;
    const companyId = Array.isArray(filters.id_perusahaan)
      ? filters.id_perusahaan[0]
      : filters.id_perusahaan;
    const includeId = filters.include_id;
    if (!companyId) return null;
    return {
      sql: `AND (NOT EXISTS (
        SELECT 1 FROM metodepembayaran mp
        WHERE mp.id_coa = main.id AND mp.id_perusahaan = ?
      )${includeId ? " OR main.id = ?" : ""})`,
      values: includeId ? [companyId, includeId] : [companyId],
    };
  },
  generateCustomJoin: (mainTable) => `
      left join coa_subtype cs on cs.id=${mainTable}.id_coa_subtype
      left join coa_type ct on ct.id=cs.id_coa_type
      left join perusahaan p on p.id=${mainTable}.id_perusahaan
    `,
});

export default Model;
