import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "produk";
const extraAllowedFields = [
  "id_kategori",
  "id_kustom",
  "id_merek",
  "tipe",
  "id_vendor",
  "stok",
  "satuan",
  "hargamodal",
  "hargajual",
  "tanggal",
  "jatuhtempo",
  "terbayar",
  "lunas",
  "keterangan",
  "manualinput",
];

const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
});

export default Model;
