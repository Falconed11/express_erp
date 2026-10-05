import db from "../../config/db.js";
import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "jurnal_expression";

const extraAllowedFieldsForCreate = ["id_filter", "filter_type", "formula"];
const extraAllowedFieldsForUpdate = ["id_filter", "filter_type", "formula"];

const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate,
  extraAllowedFieldsForUpdate,
  validFilterColumns: [
    "id",
    "nama",
    "id_filter",
    "filter_type",
    "formula",
    "aktif",
    "created_by",
    "updated_by",
  ],
  customSelect: [
    `CASE main.filter_type
      WHEN 'laporan' THEN l.nama
      WHEN 'type' THEN ct.nama
      WHEN 'subtype' THEN cs.nama
      WHEN 'coa' THEN c.nama
      ELSE NULL
    END filter_name`,
    `EXISTS (
      SELECT 1
      FROM jurnal_form_expression jfe
      JOIN jurnal_form jf ON jf.id = jfe.id_jurnal_form
      WHERE jfe.id_jurnal_expression = main.id
        AND jf.system_key IS NOT NULL
        AND jf.system_key <> ''
    ) system_form_linked`,
  ],
  generateCustomJoin: (mainTable) => `
    left join laporan l on l.id=${mainTable}.id_filter and ${mainTable}.filter_type='laporan'
    left join coa_type ct on ct.id=${mainTable}.id_filter and ${mainTable}.filter_type='type'
    left join coa_subtype cs on cs.id=${mainTable}.id_filter and ${mainTable}.filter_type='subtype'
    left join coa c on c.id=${mainTable}.id_filter and ${mainTable}.filter_type='coa'
  `,
});

export default Model;
