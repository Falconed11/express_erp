import db from "../../config/db.js";
import { generateStandardCRUDModel } from "../default/default.model.js";

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

const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate,
  extraAllowedFieldsForUpdate,
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
});

export default Model;
