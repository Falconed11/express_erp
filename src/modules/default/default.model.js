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
    console.log(filters);
    const isPagination = limit && offset;

    const safeFilterKeys = Object.keys(filters).filter((key) =>
      allowedFieldsForFilter.includes(key),
    );

    const filterSqlParts = [];
    const filterValues = [];

    safeFilterKeys.forEach((key) => {
      const value = filters[key];

      // 🔹 Case 1: Array مباشرة → main.field IN (...)
      if (Array.isArray(value)) {
        const placeholders = value.map(() => "?").join(", ");
        filterSqlParts.push(`AND main.${key} IN (${placeholders})`);
        filterValues.push(...value);
      }

      // 🔹 Case 2: Object with table + column + values
      else if (
        typeof value === "object" &&
        value !== null &&
        Array.isArray(value.values)
      ) {
        const table = value.table || "main";
        const column = value.column || key;

        const placeholders = value.values.map(() => "?").join(", ");
        filterSqlParts.push(`AND ${table}.${column} IN (${placeholders})`);
        filterValues.push(...value.values);
      }

      // 🔹 Case 3: Default (=)
      else {
        filterSqlParts.push(`AND main.${key} = ?`);
        filterValues.push(value);
      }
    });

    const filterSql = filterSqlParts.join(" ");

    const sql = `SELECT main.*, COUNT(*) OVER () total
    ${customSelect ? `, ${customSelect}` : ""}
    FROM ${tableName} main
    ${generateCustomJoin ? generateCustomJoin("main") : ""}
    WHERE 1=1 ${filterSql}
    ${isPagination ? " LIMIT ? OFFSET ?" : ""}`;

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
    console.log({ allowedFieldsForUpdate });
    const fields = [];
    const values = [];

    for (const key in data) {
      if (allowedFieldsForUpdate.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    console.log({ fields });
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
export const generateStandardCRUDModel = ({
  tableName,
  extraAllowedFieldsForCreate = [],
  extraAllowedFieldsForUpdate = [],
  ...rest
}) => {
  return generateDefaultCRUDModel(
    tableName,
    [...standardAllowedFieldsForCreate, ...extraAllowedFieldsForCreate],
    [...standardAllowedFieldsForUpdate, ...extraAllowedFieldsForUpdate],
    rest,
  );
};
