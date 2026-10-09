import { generateDefaultCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "produkmasuk_pembayaran";
const allowedFieldsForCreate = [
  "id_produkmasuk",
  "id_jurnal",
  "created_by",
  "aktif",
  "updated_by",
];
const allowedFieldsForUpdate = [
  "id_produkmasuk",
  "id_jurnal",
  "aktif",
  "updated_by",
];

const Model = generateDefaultCRUDModel(
  TABLE_NAME,
  allowedFieldsForCreate,
  allowedFieldsForUpdate,
  {
    validFilterColumns: [
      "id",
      "id_produkmasuk",
      "id_jurnal",
      "aktif",
      "created_by",
      "updated_by",
    ],
  },
);

export default Model;
