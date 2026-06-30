import db from "../../config/db.js";

export const generateDefaultCRUDModel = (
  tableName,
  allowedFieldsForCreate,
  allowedFieldsForUpdate,
  {
    allowNoUpdate = false,
    generateCustomJoin,
    customSelect,
    filterAliases = {},
    prepareData = (data) => data,
    customModel = {},
    generateOrderBy = () => "",
    generateAllowedSortFields = null,
    validFilterColumns = [],
  },
) => {
  function buildSqlQuery({
    tableName,
    filterSql,
    isPagination,
    orderBySql = null,
  }) {
    const queryCountTotal = isPagination ? "COUNT(*) OVER () total," : "";
    const orderByClause =
      orderBySql !== null ? orderBySql : generateOrderBy("main");
    const selectExpressions = Array.isArray(customSelect)
      ? customSelect.filter(Boolean)
      : customSelect
        ? [customSelect]
        : [];
    const customSelectSql = selectExpressions.length
      ? `, ${selectExpressions.join(", ")}`
      : "";
    return `SELECT main.*, ${queryCountTotal} cb.nama created_by, ub.nama updated_by
      ${customSelectSql}
      FROM ${tableName} main
      left join karyawan cb on cb.id=main.created_by
      left join karyawan ub on ub.id=main.updated_by
      ${generateCustomJoin ? generateCustomJoin("main") : ""}
      WHERE 1=1 ${filterSql}
      ${orderByClause}
      ${isPagination ? " LIMIT ? OFFSET ?" : ""}`;
  }
  return {
    async create(data, conn = db) {
      const preparedData = prepareData(data);
      // 1. Filter to get the pairs [key, value]
      const filteredEntries = Object.entries(preparedData).filter(
        ([key, value]) => {
          const isAllowedKey = allowedFieldsForCreate.includes(key);

          // Use a stricter check: allow anything that isn't null, undefined, or an empty string
          const hasValue =
            value !== null && value !== undefined && value !== "";

          return isAllowedKey && hasValue;
        },
      );

      // 2. Extract keys and values from the filtered entries
      const fieldNames = filteredEntries.map(([key]) => key);
      const values = filteredEntries.map(([_, value]) => value);

      // 3. Create the placeholders based on the count of filtered items
      const placeholders = fieldNames.map(() => "?").join(", ");

      const sql = `INSERT INTO ${tableName} (${fieldNames.join(", ")}) VALUES (${placeholders})`;
      const [result] = await conn.execute(sql, values);
      return result;
    },
    async getAll({ limit, offset, sort, ...filters }, conn = db) {
      const { from, to, ...otherFilters } = filters;
      const isPagination = limit && offset;

      // Parse and validate sort parameter
      let orderBySql = null;
      if (sort && generateAllowedSortFields) {
        const allowedSortFields = generateAllowedSortFields("main");
        const sortFields = sort.split(",").map((s) => s.trim());
        const orderByParts = [];

        for (const sortItem of sortFields) {
          let sortField = sortItem;
          let sortDirection = "ASC";

          // Check if sort starts with '-' for DESC
          if (sortItem.startsWith("-")) {
            sortField = sortItem.substring(1);
            sortDirection = "DESC";
          }

          // Validate sort field
          if (allowedSortFields[sortField]) {
            const columnPath = allowedSortFields[sortField];
            orderByParts.push(`${columnPath} ${sortDirection}`);
          }
        }

        orderByParts.push("main.id desc");

        if (orderByParts.length > 0) {
          orderBySql = `ORDER BY ${orderByParts.join(", ")}`;
        }
      }

      // Filter otherFilters to only include valid columns on the main table
      const validFilters = {};
      for (const key of Object.keys(otherFilters)) {
        const effectiveKey = filterAliases[key] || key;
        // Only include filters that are valid columns (if not explicitly prefixed with table name)
        if (!effectiveKey.includes(".") && validFilterColumns.length > 0) {
          if (validFilterColumns.includes(effectiveKey)) {
            validFilters[key] = otherFilters[key];
          }
        } else if (effectiveKey.includes(".")) {
          // Always allow filters that explicitly specify a table
          validFilters[key] = otherFilters[key];
        } else if (validFilterColumns.length === 0) {
          // If no validFilterColumns specified, allow all (backward compatibility)
          validFilters[key] = otherFilters[key];
        }
      }

      console.log(validFilters);

      /**
       * Builds SQL filter conditions and their corresponding values for use in a WHERE clause.
       * Handles simple equality, IN clauses for arrays, advanced objects with custom table/column/values,
       * and supports custom SQL operators if provided in the filter value as { value, operator } or { values, operator }.
       *
       * @param {Object} otherFilters - Key-value pairs representing filters to apply.
       * @param {Object} filterAliases - Optional mapping of filter keys to actual database column names.
       * @returns {{ filterSqlParts: string[], filterValues: any[] }}
       *   filterSqlParts: Array of SQL filter strings (e.g., 'AND main.name = ?').
       *   filterValues: Array of values to bind to the SQL statement.
       *
       * Supported filter value formats:
       *   - primitive: value (uses '=')
       *   - array: [v1, v2] (uses IN)
       *   - object: { value, operator } (e.g., { value: 5, operator: '>' })
       *   - object: { values, operator, table, column } (e.g., { values: [1,2], operator: 'NOT IN', table: 't', column: 'id' })
       */
      function buildFilterSqlAndValues(otherFilters, filterAliases) {
        const filterSqlParts = [];
        const filterValues = [];
        for (const key of Object.keys(otherFilters)) {
          const rawValue = otherFilters[key];
          const effectiveKey = filterAliases[key] || key;
          let table = "main";
          let column = effectiveKey;
          if (effectiveKey.includes(".")) {
            const parts = effectiveKey.split(".");
            table = parts[0];
            column = parts.slice(1).join(".");
          }

          // Support custom operator and value/values
          if (Array.isArray(rawValue)) {
            // If the filter value is an array, use IN clause
            const placeholders = rawValue.map(() => "?").join(", ");
            filterSqlParts.push(`AND ${table}.${column} IN (${placeholders})`);
            filterValues.push(...rawValue);
          } else if (
            typeof rawValue === "object" &&
            rawValue !== null &&
            (Array.isArray(rawValue.values) ||
              Object.prototype.hasOwnProperty.call(rawValue, "value"))
          ) {
            // If the filter value is an object with a 'values' array or a 'value' property
            const objTable = rawValue.table || table;
            const objColumn = rawValue.column || column;
            const operator =
              rawValue.operator ||
              (Array.isArray(rawValue.values) ? "IN" : "=");
            if (Array.isArray(rawValue.values)) {
              const placeholders = rawValue.values.map(() => "?").join(", ");
              filterSqlParts.push(
                `AND ${objTable}.${objColumn} ${operator} (${placeholders})`,
              );
              filterValues.push(...rawValue.values);
            } else {
              filterSqlParts.push(`AND ${objTable}.${objColumn} ${operator} ?`);
              filterValues.push(rawValue.value);
            }
          } else {
            // Otherwise, use simple equality
            filterSqlParts.push(`AND ${table}.${column} = ?`);
            filterValues.push(rawValue);
          }
        }
        return { filterSqlParts, filterValues };
      }

      function addDateFilters(filterSqlParts, filterValues, from, to) {
        if (from) {
          filterSqlParts.push(`AND j.tanggal >= ?`);
          filterValues.push(from);
        }
        if (to) {
          filterSqlParts.push(`AND j.tanggal <= ?`);
          filterValues.push(to);
        }
      }

      // Build filter SQL and values
      const { filterSqlParts, filterValues } = buildFilterSqlAndValues(
        validFilters,
        filterAliases,
      );
      addDateFilters(filterSqlParts, filterValues, from, to);
      const filterSql = filterSqlParts.join(" ");

      // Build the main SQL query
      const sql = buildSqlQuery({
        tableName,
        filterSql,
        isPagination,
        orderBySql,
      });

      // Execute the query
      const [rows] = await conn.execute(sql, [
        ...filterValues,
        ...(isPagination ? [limit, offset] : []),
      ]);

      return rows;
    },
    async getById(id, conn = db) {
      const sql = buildSqlQuery({
        tableName,
        filterSql: "AND main.id = ?",
      });
      const [rows] = await conn.execute(sql, [id]);
      return rows[0];
    },
    async patch(id, data, conn = db) {
      const preparedData = prepareData(data);
      const fields = [];
      const values = [];
      for (const key in preparedData) {
        if (allowedFieldsForUpdate.includes(key)) {
          fields.push(`${key} = ?`);
          values.push(preparedData[key]);
        }
      }
      if (!allowNoUpdate && fields.length === 0) {
        throw new Error(`No fields to update for Table ${tableName}`);
      }

      const sql = `
        UPDATE ${tableName}
        SET ${fields.join(", ")}
        WHERE id = ?
      `;

      values.push(id);

      const [result] = await conn.execute(sql, values);
      return result;
    },
    async destroy(id, conn = db) {
      const sql = `DELETE FROM ${tableName} WHERE id = ?`;
      const [result] = await conn.execute(sql, [id]);
      return result;
    },
    ...customModel,
  };
};

export const defaultFields = ["keterangan", "aktif", "updated_by"];

const standardAllowedFieldsForCreate = ["nama", "created_by", ...defaultFields];
const standardAllowedFieldsForUpdate = ["nama", ...defaultFields];

/**
 * Generates a standard model object for database operations.
 * * @param {string} tableName - The name of the database table.
 * @param {string[]} extraAllowedFieldsForCreate - An array of strings representing the permitted extra column names.
 * @param {string[]} extraAllowedFieldsForUpdate - An array of strings representing the permitted extra column names.
 * @param {string[]} validFilterColumns - An array of valid columns that can be used in filters. Defaults to standard and extra fields.
 */
export const generateStandardCRUDModel = ({
  tableName,
  extraAllowedFieldsForCreate = [],
  extraAllowedFieldsForUpdate = [],
  validFilterColumns = [],
  filterAliases = {},
  ...rest
}) => {
  const resolvedValidFilterColumns =
    validFilterColumns.length > 0
      ? validFilterColumns
      : [
          "id",
          ...standardAllowedFieldsForCreate,
          ...extraAllowedFieldsForCreate,
        ];

  return generateDefaultCRUDModel(
    tableName,
    [...standardAllowedFieldsForCreate, ...extraAllowedFieldsForCreate],
    [...standardAllowedFieldsForUpdate, ...extraAllowedFieldsForUpdate],
    { filterAliases, validFilterColumns: resolvedValidFilterColumns, ...rest },
  );
};
