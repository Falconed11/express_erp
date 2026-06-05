import db from "../../config/db.js";
import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "laporan";
// relation fields moved to `laporan_relation`; keep laporan fields minimal
const extraAllowedFields = [];
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
const allowedFieldsForCreate = [
  ...standardAllowedFieldsForCreate,
  ...extraAllowedFields,
];
const allowedFieldsForUpdate = [
  ...standardAllowedFieldsForUpdate,
  ...extraAllowedFields,
];

const prepareLaporanData = (data) => {
  // `laporan` table no longer stores relation/coas/modifier.
  // Relation-related fields (id_parent, id_coa_filter, id_coa, modifier)
  // are handled separately via `laporan_relation` CRUD operations.
  return data;
};

const formatCycleError = (node) => {
  const id = node?.id ?? "unknown";
  const nama = node?.nama ?? "unknown";
  return new Error(`Tree recursion detected on laporan id ${id} (${nama})`);
};

const validateTreeRecursion = async ({ id, id_parent }, conn = db) => {
  if (id_parent == null) return;

  const visited = new Set();
  let currentId = +id_parent;

  while (currentId != null) {
    const [rows] = await conn.execute(
      `SELECT l.id, l.nama, lr.id_parent FROM ${TABLE_NAME} l
       LEFT JOIN laporan_relation lr ON lr.id_child = l.id
       WHERE l.id = ? LIMIT 1`,
      [currentId],
    );
    const currentNode = rows[0];

    if (!currentNode) return;

    if (id != null && +currentNode.id === +id) {
      throw formatCycleError(currentNode);
    }

    if (visited.has(+currentNode.id)) {
      throw formatCycleError(currentNode);
    }

    visited.add(+currentNode.id);
    currentId = currentNode.id_parent != null ? +currentNode.id_parent : null;
  }
};

const validateTreeRecursionFromRoot = async (rootId, conn = db) => {
  if (rootId == null) return;

  // Fetch laporan names for better error messages
  const [laporanRows] = await conn.execute(
    `SELECT id, nama FROM ${TABLE_NAME}`,
  );
  const nameMap = new Map(laporanRows.map((r) => [+r.id, r.nama]));

  // Fetch relation edges (parent -> child)
  const [relRows] = await conn.execute(
    `SELECT id_parent, id_child FROM laporan_relation WHERE id_child IS NOT NULL`,
  );

  const childMap = new Map();
  for (const r of relRows) {
    const p = +r.id_parent;
    const c = +r.id_child;
    if (!childMap.has(p)) childMap.set(p, []);
    childMap.get(p).push(c);
  }

  const visitedGlobal = new Set();
  const walk = (currentId, stack = new Set()) => {
    if (currentId == null) return;
    const cid = +currentId;
    const currentName = nameMap.get(cid) ?? "unknown";

    if (stack.has(cid)) {
      throw new Error(
        `Tree recursion detected on laporan id ${cid} (${currentName})`,
      );
    }

    if (visitedGlobal.has(cid)) return;

    stack.add(cid);
    const children = childMap.get(cid) || [];
    for (const childId of children) {
      walk(childId, stack);
    }
    stack.delete(cid);
    visitedGlobal.add(cid);
  };

  walk(+rootId);
};

const Model = generateStandardCRUDModel({
  allowNoUpdate: true,
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  filterAliases: {
    id_parent: "lp.id",
    id_coa_filter: "cf.id",
    id_coa: "c.id",
    id_coa_subtype: "cs.id",
    id_coa_type: "ct.id",
  },
  customSelect:
    "lp.nama parent, cf.nama coa_filter, c.nama coa, cs.nama coa_subtype, ct.nama coa_type",
  generateCustomJoin: (mainTable) => `
    -- parent laporan via relation
    left join laporan_relation lrr on lrr.id_child = ${mainTable}.id
    left join laporan lp on lp.id = lrr.id_parent
    -- mapping rows attached directly to this laporan (id_child IS NULL)
    left join laporan_relation lrmap on lrmap.id_parent = ${mainTable}.id AND lrmap.id_child IS NULL
    left join coa_filter cf on cf.id = lrmap.id_coa_filter
    left join coa c on c.id = lrmap.id_coa
    left join coa_subtype cs on cs.id = c.id_coa_subtype
    left join coa_type ct on ct.id = cs.id_coa_type
  `,
  prepareData: prepareLaporanData,
  customModel: {
    async create(data, conn = db) {
      const preparedData = prepareLaporanData(data);

      const filteredEntries = Object.entries(preparedData).filter(
        ([key, value]) => {
          const isAllowedKey = allowedFieldsForCreate.includes(key);
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

      const newId = result.insertId;

      // If a parent relation was provided, validate and create it
      if (
        Object.prototype.hasOwnProperty.call(data, "id_parent") &&
        data.id_parent != null &&
        data.id_parent !== ""
      ) {
        await validateTreeRecursion(
          { id: newId, id_parent: data.id_parent },
          conn,
        );
        const relCols = ["id_parent", "id_child"];
        const relVals = [data.id_parent, newId];

        const maybeCols = [
          "id_coa_filter",
          "id_coa_type",
          "id_coa_subtype",
          "id_coa",
          "modifier",
          "keterangan",
          "created_by",
        ];
        for (const col of maybeCols) {
          if (
            Object.prototype.hasOwnProperty.call(data, col) &&
            data[col] !== undefined
          ) {
            relCols.push(col);
            relVals.push(data[col]);
          }
        }

        const relPlaceholders = relCols.map(() => "?").join(", ");
        const relSql = `INSERT INTO laporan_relation (${relCols.join(",")}) VALUES (${relPlaceholders})`;
        await conn.execute(relSql, relVals);
      }

      // If mapping (coa/filter) provided for this laporan itself, create mapping row (id_child IS NULL)
      const mappingCols = [];
      const mappingVals = [];
      const mappingFields = [
        "id_coa_filter",
        "id_coa_type",
        "id_coa_subtype",
        "id_coa",
        "modifier",
        "keterangan",
        "created_by",
      ];
      for (const col of mappingFields) {
        if (
          Object.prototype.hasOwnProperty.call(data, col) &&
          data[col] !== undefined
        ) {
          mappingCols.push(col);
          mappingVals.push(data[col]);
        }
      }
      if (mappingCols.length > 0) {
        // ensure id_parent and id_child columns are present
        mappingCols.unshift("id_child");
        mappingVals.unshift(null);
        mappingCols.unshift("id_parent");
        mappingVals.unshift(newId);
        const mapPlaceholders = mappingCols.map(() => "?").join(", ");
        const mapSql = `INSERT INTO laporan_relation (${mappingCols.join(",")}) VALUES (${mapPlaceholders})`;
        await conn.execute(mapSql, mappingVals);
      }

      return result;
    },
    async patch(id, data, conn = db) {
      const preparedData = prepareLaporanData(data);

      // Update laporan core fields
      const fields = [];
      const values = [];
      for (const key in preparedData) {
        if (allowedFieldsForUpdate.includes(key)) {
          fields.push(`${key} = ?`);
          values.push(preparedData[key]);
        }
      }

      if (fields.length > 0) {
        const sql = `
        UPDATE ${TABLE_NAME}
        SET ${fields.join(", ")}
        WHERE id = ?
      `;
        values.push(id);
        await conn.execute(sql, values);
      }

      // Handle parent relation (id_parent)
      if (Object.prototype.hasOwnProperty.call(data, "id_parent")) {
        // find existing parent relation for this child
        const [existing] = await conn.execute(
          `SELECT id, id_parent FROM laporan_relation WHERE id_child = ? AND id_parent IS NOT NULL LIMIT 1`,
          [id],
        );
        const existingRow = existing[0];

        if (data.id_parent == null || data.id_parent === "") {
          // remove existing parent relation if any
          if (existingRow) {
            await conn.execute(`DELETE FROM laporan_relation WHERE id = ?`, [
              existingRow.id,
            ]);
          }
        } else {
          // validate cycle with new parent
          await validateTreeRecursion({ id, id_parent: data.id_parent }, conn);
          if (existingRow) {
            // update existing relation
            const relFields = [];
            const relValues = [];
            // if parent changed
            relFields.push(`id_parent = ?`);
            relValues.push(data.id_parent);
            const maybeCols = [
              "id_coa_filter",
              "id_coa_type",
              "id_coa_subtype",
              "id_coa",
              "modifier",
              "keterangan",
              "updated_by",
            ];
            for (const col of maybeCols) {
              if (Object.prototype.hasOwnProperty.call(data, col)) {
                relFields.push(`${col} = ?`);
                relValues.push(data[col]);
              }
            }
            relValues.push(existingRow.id);
            await conn.execute(
              `UPDATE laporan_relation SET ${relFields.join(", ")} WHERE id = ?`,
              relValues,
            );
          } else {
            // insert new parent relation
            const relCols = ["id_parent", "id_child"];
            const relVals = [data.id_parent, id];
            const maybeCols = [
              "id_coa_filter",
              "id_coa_type",
              "id_coa_subtype",
              "id_coa",
              "modifier",
              "keterangan",
              "created_by",
            ];
            for (const col of maybeCols) {
              if (Object.prototype.hasOwnProperty.call(data, col)) {
                relCols.push(col);
                relVals.push(data[col]);
              }
            }
            const relPlaceholders = relCols.map(() => "?").join(", ");
            const relSql = `INSERT INTO laporan_relation (${relCols.join(",")}) VALUES (${relPlaceholders})`;
            await conn.execute(relSql, relVals);
          }
        }
      }

      // Handle mapping row for this laporan (id_child IS NULL)
      const mappingFields = [
        "id_coa_filter",
        "id_coa_type",
        "id_coa_subtype",
        "id_coa",
        "modifier",
        "keterangan",
        "updated_by",
      ];
      const hasMappingUpdate = mappingFields.some((f) =>
        Object.prototype.hasOwnProperty.call(data, f),
      );
      if (hasMappingUpdate) {
        const [existingMap] = await conn.execute(
          `SELECT id FROM laporan_relation WHERE id_parent = ? AND id_child IS NULL LIMIT 1`,
          [id],
        );
        const mapRow = existingMap[0];
        if (mapRow) {
          const setParts = [];
          const vals = [];
          for (const col of mappingFields) {
            if (Object.prototype.hasOwnProperty.call(data, col)) {
              setParts.push(`${col} = ?`);
              vals.push(data[col]);
            }
          }
          vals.push(mapRow.id);
          await conn.execute(
            `UPDATE laporan_relation SET ${setParts.join(", ")} WHERE id = ?`,
            vals,
          );
        } else {
          const cols = ["id_parent"];
          const vals = [id];
          for (const col of mappingFields) {
            if (Object.prototype.hasOwnProperty.call(data, col)) {
              cols.push(col);
              vals.push(data[col]);
            }
          }
          const placeholders = cols.map(() => "?").join(", ");
          await conn.execute(
            `INSERT INTO laporan_relation (${cols.join(",")}) VALUES (${placeholders})`,
            vals,
          );
        }
      }

      return { affectedRows: 1 };
    },
    async getById(id, data, conn = db) {
      const { from, to, id_perusahaan } = data;
      let sql = ``;
      if (data.type == "tree") {
        // await validateTreeRecursionFromRoot(id, conn);

        const filterClauses = [];
        const values = [id];

        if (from != null && from !== "") {
          filterClauses.push("AND j.tanggal >= ?");
          values.push(from);
        }
        if (to != null && to !== "") {
          filterClauses.push("AND j.tanggal <= ?");
          values.push(to);
        }
        if (id_perusahaan != null && id_perusahaan !== "") {
          filterClauses.push("AND j.id_perusahaan = ?");
          values.push(id_perusahaan);
        }

        //         sql = `
        // WITH RECURSIVE tree AS (
        //     -- 1. Anchor Member
        //     SELECT
        //         id AS id_laporan_relation,
        //         id_parent,
        //         id_child,
        //         id_coa_type,
        //         id_coa_subtype,
        //         id_coa,
        //         modifier,
        //         CAST(id AS CHAR(1000)) AS path,
        //         FALSE AS has_cycle,
        //         1 AS level -- <-- START AT LEVEL 1
        //     FROM laporan_relation
        //     WHERE id_parent = ?

        //     UNION ALL

        //     -- 2. Recursive Member
        //     SELECT
        //         lr.id AS id_laporan_relation,
        //         lr.id_parent,
        //         lr.id_child,
        //         lr.id_coa_type,
        //         lr.id_coa_subtype,
        //         lr.id_coa,
        //         lr.modifier,
        //         CONCAT(t.path, ',', lr.id),
        //         FIND_IN_SET(lr.id, t.path) > 0 AS has_cycle,
        //         t.level + 1 AS level -- <-- INCREMENT LEVEL ON EACH HOP
        //     FROM laporan_relation lr
        //     JOIN tree t ON lr.id_parent = t.id_child
        //     WHERE NOT t.has_cycle
        // )
        // -- 3. Final Select
        // SELECT t.*, l.nama, l.keterangan
        // FROM tree t
        // LEFT JOIN laporan l ON l.id = t.id_child;
        //         `;

        sql = `WITH RECURSIVE laporan_tree AS (
    -- Root
    SELECT
        CONCAT('LR_', lr.id) AS node_id,
        NULL AS parent_node_id,
        lr.id AS id_laporan_relation,
        lr.id_child,
        lr.id_coa_type,
        lr.id_coa_subtype,
        lr.id_coa,
        1 AS level,
        'laporan' AS node_type,
        lr.id AS real_id
    FROM laporan_relation lr
    WHERE lr.id_parent = ?

    UNION ALL

    -- Children
    SELECT
        CONCAT('LR_', lr.id) AS node_id,
        lt.node_id AS parent_node_id,
        lr.id AS id_laporan_relation,
        lr.id_child,
        lr.id_coa_type,
        lr.id_coa_subtype,
        lr.id_coa,
        lt.level + 1 AS level,
        'laporan' AS node_type,
        lr.id AS real_id
    FROM laporan_relation lr
    JOIN laporan_tree lt
        ON lr.id_parent = lt.id_child
)

-- ==========================
-- LAPORAN NODES
-- ==========================
SELECT
    node_id,
    parent_node_id,
    node_type,
    real_id,
    id_laporan_relation,
    level
FROM laporan_tree

UNION ALL

-- ==========================
-- COA TYPE DIRECTLY ATTACHED
-- ==========================
SELECT
    CONCAT('CT_', ct.id) AS node_id,
    lt.node_id AS parent_node_id,
    'coa_type' AS node_type,
    ct.id AS real_id,
    NULL AS id_laporan_relation,
    lt.level + 1 AS level
FROM laporan_tree lt
JOIN coa_type ct
    ON ct.id = lt.id_coa_type

UNION ALL

-- ==========================
-- SUBTYPE FROM TYPE
-- ==========================
SELECT
    CONCAT('CS_', cs.id) AS node_id,
    CONCAT('CT_', cs.id_coa_type) AS parent_node_id,
    'coa_subtype' AS node_type,
    cs.id AS real_id,
    NULL AS id_laporan_relation,
    lt.level + 2 AS level
FROM laporan_tree lt
JOIN coa_subtype cs
    ON cs.id_coa_type = lt.id_coa_type

UNION ALL

-- ==========================
-- COA FROM TYPE
-- ==========================
SELECT
    CONCAT('C_', c.id) AS node_id,
    CONCAT('CS_', c.id_coa_subtype) AS parent_node_id,
    'coa' AS node_type,
    c.id AS real_id,
    NULL AS id_laporan_relation,
    lt.level + 3 AS level
FROM laporan_tree lt
JOIN coa_subtype cs
    ON cs.id_coa_type = lt.id_coa_type
JOIN coa c
    ON c.id_coa_subtype = cs.id

UNION ALL

-- ==========================
-- SUBTYPE DIRECTLY ATTACHED
-- ==========================
SELECT
    CONCAT('CS_', cs.id) AS node_id,
    lt.node_id AS parent_node_id,
    'coa_subtype' AS node_type,
    cs.id AS real_id,
    NULL AS id_laporan_relation,
    lt.level + 1 AS level
FROM laporan_tree lt
JOIN coa_subtype cs
    ON cs.id = lt.id_coa_subtype

UNION ALL

-- ==========================
-- COA FROM SUBTYPE
-- ==========================
SELECT
    CONCAT('C_', c.id) AS node_id,
    CONCAT('CS_', c.id_coa_subtype) AS parent_node_id,
    'coa' AS node_type,
    c.id AS real_id,
    NULL AS id_laporan_relation,
    CASE
        WHEN lt.id_coa_subtype IS NOT NULL
        THEN lt.level + 2
    END AS level
FROM laporan_tree lt
JOIN coa c
    ON c.id_coa_subtype = lt.id_coa_subtype

UNION ALL

-- ==========================
-- SINGLE COA DIRECTLY ATTACHED
-- ==========================
SELECT
    CONCAT('C_', c.id) AS node_id,
    lt.node_id AS parent_node_id,
    'coa' AS node_type,
    c.id AS real_id,
    NULL AS id_laporan_relation,
    lt.level + 1 AS level
FROM laporan_tree lt
JOIN coa c
    ON c.id = lt.id_coa;`;

        const [rows] = await conn.execute(sql, values);
        return rows;
      }
      sql = `SELECT * FROM ${TABLE_NAME} WHERE id = ?`;
      const [rows] = await conn.execute(sql, [id]);
      return rows[0];
    },
  },
});

export default Model;
