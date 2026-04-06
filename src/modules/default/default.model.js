import db from "../../config/db.js";

/**
 * Generates a default model object for database operations.
 * * @param {string} tableName - The name of the database table.
 * @param {string[]} allowedFieldsForUpdate - An array of strings representing the permitted column names.
 * @param {string[]} allowedFieldsForCreate - An array of strings representing the permitted column names.
 */
export const generateDefaultCRUDModel = (
  tableName,
  allowedFieldsForCreate,
  allowedFieldsForUpdate,
  { generateCustomJoin, customSelect, allowedFieldsForFilter = [] },
) => ({
  async create(data) {
    const fields = Object.keys(data).filter((key) =>
      allowedFieldsForCreate.includes(key),
    );
    const placeholders = fields.map(() => "?").join(", ");
    const values = fields.map((key) => data[key]);

    const sql = `INSERT INTO ${tableName} (${fields.join(", ")}) VALUES (${placeholders})`;
    const [result] = await db.execute(sql, values);
    return result;
  },

  async getAll({ limit, offset, ...filters }) {
    const isPagination = limit && offset;

    const safeFilterKeys = Object.keys(filters).filter((key) =>
      allowedFieldsForFilter.includes(key),
    );

    const filterSql = safeFilterKeys
      .map((key) => `AND main.${key} = ?`)
      .join(" ");
    const filterValues = safeFilterKeys.map((key) => filters[key]);

    const sql = `SELECT main.*, COUNT(*) OVER () total
    ${customSelect ? `, ${customSelect}` : ""}
    FROM ${tableName} main
    ${generateCustomJoin ? generateCustomJoin("main") : ""}
    where 1=1 ${filterSql}
    ${isPagination ? " limit ? offset ?" : ""}`;
    const [rows] = await db.execute(sql, [
      ...filterValues,
      ...(isPagination ? [limit, offset] : []),
    ]);
    return rows;
  },

  async getById(id) {
    const sql = `SELECT * FROM ${tableName} WHERE id = ?`;
    const [rows] = await db.execute(sql, [id]);
    return rows[0];
  },

  async patch(id, data) {
    const fields = [];
    const values = [];

    for (const key in data) {
      if (allowedFieldsForUpdate.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    const sql = `
        UPDATE ${tableName}
        SET ${fields.join(", ")}
        WHERE id = ?
      `;

    values.push(id);

    const [result] = await db.execute(sql, values);
    return result;
  },

  async destroy(id) {
    const sql = `DELETE FROM ${tableName} WHERE id = ?`;
    const [result] = await db.execute(sql, [id]);
    return result;
  },
});

const standardAllowedFieldsForCreate = [
  "nama",
  "keterangan",
  "created_by",
  "updated_by",
];
const standardAllowedFieldsForUpdate = [
  "nama",
  "keterangan",
  "aktif",
  "updated_by",
];

/**
 * Generates a standard model object for database operations.
 * * @param {string} tableName - The name of the database table.
 * @param {string[]} extraAllowedFieldsForCreate - An array of strings representing the permitted extra column names.
 * @param {string[]} extraAllowedFieldsForUpdate - An array of strings representing the permitted extra column names.
 */
export const generateStandardCRUDModel = (
  tableName,
  extraAllowedFieldsForCreate = [],
  extraAllowedFieldsForUpdate = [],
  rest = {},
) => {
  console.log({ rest });
  return generateDefaultCRUDModel(
    tableName,
    [...standardAllowedFieldsForCreate, ...extraAllowedFieldsForCreate],
    [...standardAllowedFieldsForUpdate, ...extraAllowedFieldsForUpdate],
    rest,
  );
};
