import db from "../../config/db.js";
import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "jurnal_form";

const extraAllowedFieldsForCreate = ["extra_fields", "system_key"];
const extraAllowedFieldsForUpdate = ["extra_fields", "system_key"];

const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate,
  extraAllowedFieldsForUpdate,
  validFilterColumns: [
    "id",
    "nama",
    "aktif",
    "created_by",
    "updated_by",
    "extra_fields",
    "system_key",
  ],
});

export default Model;
