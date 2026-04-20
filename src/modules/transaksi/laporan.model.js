import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "laporan";
const extraAllowedFields = ["id_parent", "id_coa_filter", "id_coa"];
const Model = generateStandardCRUDModel({
  allowNoUpdate: true,
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: {
    id_parent: "lp.id",
    id_coa_filter: "cf.id",
    id_coa: "c.id",
    id_coa_subtype: "cs.id",
    id_coa_type: "ct.id",
  },
  customSelect:
    "lp.nama parent, cf.nama coa_filter, c.nama coa, cs.nama coa_subtype, ct.nama coa_type",
  generateCustomJoin: (mainTable) => `
    left join laporan lp on lp.id=${mainTable}.id_parent
    left join coa_filter cf on cf.id=${mainTable}.id_coa_filter
    left join coa c on c.id=${mainTable}.id_coa
    left join coa_subtype cs on cs.id=c.id_coa_subtype
    left join coa_type ct on ct.id=cs.id_coa_type
  `,
  customModel: {
    async getById(id, data, conn = db) {
      let sql = "";

      sql = `SELECT * FROM ${tableName} WHERE id = ?`;
      const [rows] = await conn.execute(sql, [id]);
      return rows[0];
    },
  },
});

export default Model;
