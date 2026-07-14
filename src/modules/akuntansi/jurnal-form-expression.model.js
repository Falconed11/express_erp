import db from "../../config/db.js";
import { AUDIT_FIELDS } from "../../utils/const.js";
import { generateDefaultCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "jurnal_form_expression";

const extraAllowedFieldsForCreate = [
  "id_jurnal_form",
  "id_jurnal_expression",
  "input_type",
  "sort_order",
];
const extraAllowedFieldsForUpdate = [
  "id_jurnal_form",
  "id_jurnal_expression",
  "input_type",
  "sort_order",
];
const allowedFieldsForCreate = [
  "created_by",
  ...AUDIT_FIELDS,
  ...extraAllowedFieldsForCreate,
];
const allowedFieldsForUpdate = [
  ...AUDIT_FIELDS,
  ...extraAllowedFieldsForUpdate,
];

const Model = generateDefaultCRUDModel(
  TABLE_NAME,
  allowedFieldsForCreate,
  allowedFieldsForUpdate,
  {
    validFilterColumns: [
      "id",
      "id_jurnal_form",
      "id_jurnal_expression",
      "input_type",
      "sort_order",
      "aktif",
      "created_by",
      "updated_by",
    ],
    filterAliases: {
      id_jurnal_form: "jf.id",
      id_jurnal_expression: "je.id",
    },
    customSelect: [
      "jf.nama jurnal_form",
      "je.nama jurnal_expression",
      "je.filter_type",
      "je.id_filter",
      `CASE je.filter_type
        WHEN 'laporan' THEN l.nama
        WHEN 'type' THEN ct.nama
        WHEN 'subtype' THEN cs.nama
        WHEN 'coa' THEN c.nama
        ELSE NULL
      END filter_name`,
    ],
    generateCustomJoin: (mainTable) => `
      left join jurnal_form jf on jf.id=${mainTable}.id_jurnal_form
      left join jurnal_expression je on je.id=${mainTable}.id_jurnal_expression
      left join coa c on c.id=je.id_filter and je.filter_type='coa'
      left join coa_subtype cs on cs.id=je.id_filter and je.filter_type='subtype'
      left join coa_type ct on ct.id=je.id_filter and je.filter_type='type'
      left join laporan l on l.id=je.id_filter and je.filter_type='laporan'
    `,
  },
);

export default Model;
