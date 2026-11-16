import { generateDefaultCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "jenis_aktivitas_sales";
const allowedFields = [
  "nama",
  "aktif",
  "created_by",
  "updated_by",
  "keterangan",
];

const Model = generateDefaultCRUDModel(
  TABLE_NAME,
  allowedFields,
  ["nama", "aktif", "updated_by", "keterangan"],
  {
    validFilterColumns: ["id", ...allowedFields],
  },
);

export default Model;
