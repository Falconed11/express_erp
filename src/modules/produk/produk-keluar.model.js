import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "produkkeluar";
const extraAllowedFields = ["id_jurnal", "id_produkmasuk"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
});

export default Model;
