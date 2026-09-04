import { generateDefaultCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "app_config";
const allowedFields = [
  "key",
  "value",
  "id_perusahaan",
  "created_by",
  "keterangan",
  "aktif",
  "updated_by",
];

const serializeValue = (value) =>
  value === null || value === undefined ? value : JSON.stringify(value);

const prepareData = (data) => ({
  ...data,
  ...(Object.prototype.hasOwnProperty.call(data, "value")
    ? { value: serializeValue(data.value) }
    : {}),
});

const deserializeValue = (row) => {
  if (!row || typeof row.value !== "string") return row;

  try {
    return { ...row, value: JSON.parse(row.value) };
  } catch {
    return row;
  }
};

const baseModel = generateDefaultCRUDModel(
  TABLE_NAME,
  allowedFields,
  ["key", "value", "id_perusahaan", "keterangan", "aktif", "updated_by"],
  {
    prepareData,
    validFilterColumns: ["id", ...allowedFields],
  },
);

const Model = {
  ...baseModel,
  async getAll(...args) {
    const rows = await baseModel.getAll(...args);
    return rows.map(deserializeValue);
  },
  async getById(...args) {
    return deserializeValue(await baseModel.getById(...args));
  },
};

export default Model;
