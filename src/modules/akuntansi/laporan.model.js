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

        const query = `WITH RECURSIVE tree AS (

    /* ROOT */
    SELECT
        CAST(CONCAT('report_', id) AS CHAR(100)) AS node_key,
        CAST(NULL AS CHAR(100)) AS parent_node_key,

        CAST(NULL AS SIGNED) AS id_laporan_relation,
        id AS id_laporan,

        CAST(NULL AS SIGNED) AS id_coa_type,
        CAST(NULL AS SIGNED) AS id_coa_subtype,
        CAST(NULL AS SIGNED) AS id_coa,

        CAST(NULL AS CHAR(10)) AS modifier,

        CAST(CONCAT('report_', id) AS CHAR(4000)) AS path,
        FALSE AS has_cycle,
        0 AS level,

        CAST('report' AS CHAR(20)) AS node_type,

        nama,
        keterangan

    FROM laporan
    WHERE id = ?

    UNION ALL

    /* LAPORAN -> RELATION */
    SELECT
        CAST(CONCAT('section_', lr.id) AS CHAR(100)),
        CAST(t.node_key AS CHAR(100)),

        lr.id,
        lr.id_child,

        lr.id_coa_type,
        lr.id_coa_subtype,
        lr.id_coa,

        lr.modifier,

        CONCAT(t.path, ',', CONCAT('section_', lr.id)),

        FIND_IN_SET(
            CONCAT('section_', lr.id),
            REPLACE(t.path, ',', ',')
        ) > 0,

        t.level + 1,

        CAST(case
          when lr.id_coa IS NOT NULL then 'coa'
          when lr.id_coa_subtype IS NOT NULL then 'subtype'
          when lr.id_coa_type IS NOT NULL then 'type'
          when lr.id_child IS NOT NULL then 'section'
        end AS CHAR(20)),

        coalesce(c.nama, cs.nama, ct.nama, l.nama),
        coalesce(c.keterangan, cs.keterangan, ct.keterangan, l.keterangan)

    FROM tree t
    JOIN laporan_relation lr
        ON lr.id_parent = t.id_laporan
    left JOIN coa c
       ON c.id = lr.id_coa
    left JOIN coa_subtype cs
       ON cs.id = lr.id_coa_subtype
    left JOIN coa_type ct
       ON ct.id = lr.id_coa_type
    left JOIN laporan l
       ON l.id = lr.id_child
    WHERE t.node_type IN ('report','section')
      AND NOT t.has_cycle
),

expanded AS (

    /* ORIGINAL TREE */
    SELECT *
    FROM tree

    UNION ALL

    /* TYPE -> SUBTYPE */
    SELECT
        CAST(
            CONCAT(
                'sub_',
                cs.id,
                '_rel_',
                t.id_laporan_relation
            ) AS CHAR(100)
        ) AS node_key,

        CAST(t.node_key AS CHAR(100)) AS parent_node_key,

        NULL AS id_laporan_relation,
        NULL AS id_laporan,

        NULL AS id_coa_type,
        cs.id AS id_coa_subtype,
        NULL AS id_coa,

        t.modifier,

        CONCAT(
            t.path,
            ',',
            CONCAT(
                'sub_',
                cs.id,
                '_rel_',
                t.id_laporan_relation
            )
        ),

        FALSE,

        t.level + 1,

        CAST('subtype' AS CHAR(20)),

        cs.nama,
        NULL AS keterangan

    FROM tree t
    JOIN coa_subtype cs
        ON cs.id_coa_type = t.id_coa_type
    WHERE t.id_coa_type IS NOT NULL

    UNION ALL

    /* RELATION SUBTYPE -> COA */
    SELECT
        CAST(
            CONCAT(
                'coa_',
                c.id,
                '_rel_',
                t.id_laporan_relation
            ) AS CHAR(100)
        ),

        CAST(t.node_key AS CHAR(100)),

        NULL,
        NULL,

        NULL,
        t.id_coa_subtype,
        c.id,

        t.modifier,

        CONCAT(
            t.path,
            ',',
            CONCAT(
                'coa_',
                c.id,
                '_rel_',
                t.id_laporan_relation
            )
        ),

        FALSE,

        t.level + 1,

        CAST('coa' AS CHAR(20)),

        c.nama,
        NULL

    FROM tree t
    JOIN coa c
        ON c.id_coa_subtype = t.id_coa_subtype
    WHERE t.id_coa_subtype IS NOT NULL

    UNION ALL

    /* GENERATED SUBTYPE -> COA */
    SELECT
        CAST(
            CONCAT(
                'coa_',
                c.id,
                '_sub_',
                e.id_coa_subtype,
                '_parent_',
                e.node_key
            ) AS CHAR(100)
        ),

        CAST(e.node_key AS CHAR(100)),

        NULL,
        NULL,

        NULL,
        e.id_coa_subtype,
        c.id,

        e.modifier,

        CONCAT(
            e.path,
            ',',
            CONCAT(
                'coa_',
                c.id,
                '_sub_',
                e.id_coa_subtype
            )
        ),

        FALSE,

        e.level + 1,

        CAST('coa' AS CHAR(20)),

        c.nama,
        NULL

    FROM expanded e
    JOIN coa c
        ON c.id_coa_subtype = e.id_coa_subtype
    WHERE e.node_type = 'subtype'
),
node_nominal AS (
    SELECT
        e.node_key,

        COALESCE(
            SUM(
                CASE WHEN ct.normal_balance = 1 THEN 1 ELSE -1 END
                * CASE WHEN t.tipe = 1 THEN 1 ELSE -1 END
                * t.amount
            ),
            0
        ) AS own_nominal

    FROM expanded e
    LEFT JOIN coa c
        ON c.id = e.id_coa
    LEFT JOIN coa_subtype cs
        ON cs.id = c.id_coa_subtype
    LEFT JOIN coa_type ct
        ON ct.id = cs.id_coa_type
    LEFT JOIN transaksi t
        ON t.id_coa = c.id
    GROUP BY e.node_key
)

SELECT
    e.node_key as id,
    e.parent_node_key as id_parent,

    e.id_laporan_relation,
    e.id_laporan,

    e.id_coa_type,
    e.id_coa_subtype,
    e.id_coa,

    e.modifier,

    e.level,
    e.node_type,

    e.nama,
    e.keterangan,

    e.path,
    e.has_cycle,

    COALESCE(
        SUM(
            n.own_nominal
            * CASE
                WHEN d.node_type = 'section'
                    THEN COALESCE(d.modifier, 1)
                ELSE 1
              END
        ),
        0
    ) AS total_balance

FROM expanded e

LEFT JOIN expanded d
    ON FIND_IN_SET(e.node_key, d.path) > 0

LEFT JOIN node_nominal n
    ON n.node_key = d.node_key

GROUP BY
    e.node_key,
    e.parent_node_key,
    e.id_laporan_relation,
    e.id_laporan,
    e.id_coa_type,
    e.id_coa_subtype,
    e.id_coa,
    e.modifier,
    e.level,
    e.node_type,
    e.nama,
    e.keterangan,
    e.path,
    e.has_cycle

ORDER BY e.level, e.path;`;

        const [rows] = await conn.execute(query, values);
        return rows;
      }
      const query = `SELECT * FROM ${TABLE_NAME} WHERE id = ?`;
      const [rows] = await conn.execute(query, [id]);
      return rows[0];
    },
  },
});

export default Model;
