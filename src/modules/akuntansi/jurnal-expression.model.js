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
});

export default Model;
