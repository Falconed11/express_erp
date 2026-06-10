import db from "../../config/db.js";
import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "laporan_relation";
const extraAllowedFields = [
  "id_parent",
  "id_child",
  "id_laporan",
  "id_coa_filter",
  "id_coa_type",
  "id_coa_subtype",
  "id_coa",
  "modifier",
];
const priorityFields = [
  "id_coa",
  "id_coa_filter",
  "id_coa_subtype",
  "id_coa_type",
];
const standardAllowedFieldsForCreate = [
  "nama",
  "created_by",
  "keterangan",
  "aktif",
  "updated_by",
];
const standardAllowedFieldsForUpdate = [
  "nama",
  "keterangan",
  "aktif",
  "updated_by",
];

const normalizeNullValues = (data) => {
  const normalized = { ...data };
  for (const key of [
    "id_parent",
    "id_child",
    "id_coa",
    "id_coa_filter",
    "id_coa_subtype",
    "id_coa_type",
  ]) {
    if (Object.prototype.hasOwnProperty.call(normalized, key)) {
      if (normalized[key] === "") {
        normalized[key] = null;
      }
    }
  }
  return normalized;
};

const normalizePriority = (data, { strict = false } = {}) => {
  const prepared = normalizeNullValues(data);
  const hasPriorityTouch = priorityFields.some((key) =>
    Object.prototype.hasOwnProperty.call(prepared, key),
  );

  if (!strict && !hasPriorityTouch) {
    return prepared;
  }

  const values = {
    id_coa: Object.prototype.hasOwnProperty.call(prepared, "id_coa")
      ? prepared.id_coa
      : null,
    id_coa_filter: Object.prototype.hasOwnProperty.call(
      prepared,
      "id_coa_filter",
    )
      ? prepared.id_coa_filter
      : null,
    id_coa_subtype: Object.prototype.hasOwnProperty.call(
      prepared,
      "id_coa_subtype",
    )
      ? prepared.id_coa_subtype
      : null,
    id_coa_type: Object.prototype.hasOwnProperty.call(prepared, "id_coa_type")
      ? prepared.id_coa_type
      : null,
  };

  if (values.id_coa != null) {
    return {
      ...prepared,
      id_coa: values.id_coa,
      id_coa_filter: null,
      id_coa_subtype: null,
      id_coa_type: null,
    };
  }
  if (values.id_coa_filter != null) {
    return {
      ...prepared,
      id_coa: null,
      id_coa_filter: values.id_coa_filter,
      id_coa_subtype: null,
      id_coa_type: null,
    };
  }
  if (values.id_coa_subtype != null) {
    return {
      ...prepared,
      id_coa: null,
      id_coa_filter: null,
      id_coa_subtype: values.id_coa_subtype,
      id_coa_type: null,
    };
  }
  if (values.id_coa_type != null) {
    return {
      ...prepared,
      id_coa: null,
      id_coa_filter: null,
      id_coa_subtype: null,
      id_coa_type: values.id_coa_type,
    };
  }

  return {
    ...prepared,
    id_coa: null,
    id_coa_filter: null,
    id_coa_subtype: null,
    id_coa_type: null,
  };
};

const enforceParentChildDifferent = (data) => {
  if (
    data.id_parent != null &&
    data.id_child != null &&
    +data.id_parent === +data.id_child
  ) {
    throw new Error("id_parent and id_child must not be the same");
  }
  return data;
};

const formatCycleError = (node) => {
  const id = node?.id ?? "unknown";
  const parent = node?.id_parent ?? "unknown";
  return new Error(
    `Tree recursion detected for laporan_relation row ${id} using parent ${parent}`,
  );
};

const validateNoRecurringNode = async (
  { id, id_parent, id_child },
  conn = db,
) => {
  if (id_child == null) return;

  const childId = +id_child;
  const parentId = id_parent != null ? +id_parent : null;
  if (parentId === childId) {
    throw new Error("id_parent and id_child must not be the same");
  }

  const [existingChildRows] = await conn.execute(
    `SELECT id FROM ${TABLE_NAME} WHERE id_child = ? AND id != ? LIMIT 1`,
    [childId, id || 0],
  );

  // if (existingChildRows.length > 0) {
  //   throw new Error(`id_child ${childId} already has a parent relation`);
  // }

  const visited = new Set();
  const queue = parentId == null ? [] : [parentId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) {
      throw formatCycleError({ id, id_parent: currentId });
    }
    if (currentId === childId) {
      throw formatCycleError({ id, id_parent: currentId });
    }
    visited.add(currentId);

    const [rows] = await conn.execute(
      `SELECT id_parent FROM ${TABLE_NAME} WHERE id_child = ? AND id != ?`,
      [currentId, id || 0],
    );
    for (const row of rows) {
      if (row.id_parent != null) {
        queue.push(+row.id_parent);
      }
    }
  }
};

const prepareRelationData = (data, { strictPriority = false } = {}) => {
  const normalized = normalizePriority(data, { strict: strictPriority });
  enforceParentChildDifferent(normalized);
  return normalized;
};

const Model = generateStandardCRUDModel({
  allowNoUpdate: true,
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: {
    id_parent: "lp.id",
    id_child: "lc.id",
    id_laporan: "l.id",
    id_coa_filter: "cf.id",
    id_coa: "c.id",
    id_coa_subtype: "cs.id",
    id_coa_type: "ct.id",
  },
  customSelect:
    "lp.nama parent, lc.nama child, l.nama laporan, cf.nama coa_filter, c.nama coa, cs.nama coa_subtype, ct.nama coa_type",
  generateCustomJoin: (mainTable) => `
    left join laporan lp on lp.id=${mainTable}.id_parent
    left join laporan lc on lc.id=${mainTable}.id_child
    left join laporan l on l.id=${mainTable}.id_laporan
    left join coa_filter cf on cf.id=${mainTable}.id_coa_filter
    left join coa c on c.id=${mainTable}.id_coa
    left join coa_subtype cs on cs.id=${mainTable}.id_coa_subtype
    left join coa_type ct on ct.id=${mainTable}.id_coa_type
  `,
  prepareData: (data) => prepareRelationData(data, { strictPriority: true }),
  customModel: {
    async create(data, conn = db) {
      const preparedData = prepareRelationData(data, { strictPriority: true });
      await validateNoRecurringNode(
        {
          id_parent: preparedData.id_parent,
          id_child: preparedData.id_child,
        },
        conn,
      );

      const filteredEntries = Object.entries(preparedData).filter(
        ([key, value]) => {
          const isAllowedKey = [
            ...standardAllowedFieldsForCreate,
            ...extraAllowedFields,
          ].includes(key);
          const hasValue =
            value !== null && value !== undefined && value !== "";
          return isAllowedKey && hasValue;
        },
      );

      const fieldNames = filteredEntries.map(([key]) => key);
      const values = filteredEntries.map(([_, value]) => value);
      const placeholders = fieldNames.map(() => "?").join(", ");
      const sql = `INSERT INTO ${TABLE_NAME} (${fieldNames.join(", ")}) VALUES (${placeholders})`;
      const [result] = await conn.execute(sql, values);
      return result;
    },
    async patch(id, data, conn = db) {
      const [rows] = await conn.execute(
        `SELECT id_parent, id_child FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`,
        [id],
      );
      const existing = rows[0];
      if (!existing) {
        throw new Error("Data not found");
      }

      const touchedPriority = priorityFields.some((key) =>
        Object.prototype.hasOwnProperty.call(data, key),
      );
      const effectiveData = {
        ...existing,
        ...data,
      };
      const preparedData = prepareRelationData(effectiveData, {
        strictPriority: touchedPriority,
      });
      await validateNoRecurringNode(
        {
          id,
          id_parent: preparedData.id_parent,
          id_child: preparedData.id_child,
        },
        conn,
      );

      const fields = [];
      const values = [];
      const updateData = { ...data };
      if (touchedPriority) {
        for (const key of priorityFields) {
          updateData[key] = preparedData[key];
        }
      }

      for (const key in updateData) {
        if (
          [...standardAllowedFieldsForUpdate, ...extraAllowedFields].includes(
            key,
          )
        ) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      }

      if (fields.length === 0) {
        throw new Error(`No fields to update for Table ${TABLE_NAME}`);
      }

      const sql = `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(", ")}
        WHERE id = ?
      `;
      values.push(id);
      const [result] = await conn.execute(sql, values);
      return result;
    },
  },
});

export default Model;
