import db from "../../config/db.js";
import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "laporan";
// relation fields moved to `laporan_relation`; keep laporan fields minimal
const extraAllowedFields = ["isReport"];
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

const fetchTreeRows = async (
  { id, from, to, id_perusahaan, includeBalance = true, nodeTypes = null } = {},
  conn = db,
) => {
  const filterClauses = [];
  const values = [id];

  const hasCompanyFilter =
    id_perusahaan != null && id_perusahaan !== "" && id_perusahaan !== 0;

  const coaCompanyCondition = hasCompanyFilter
    ? "AND (c.id_perusahaan IS NULL OR c.id_perusahaan = ?)"
    : "";

  const companyFilterValues = hasCompanyFilter
    ? [id_perusahaan, id_perusahaan, id_perusahaan, id_perusahaan]
    : [];

  values.push(...companyFilterValues);

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

  const query = `
    WITH RECURSIVE tree AS (

      /* ROOT */

      SELECT
          CAST(CONCAT('report_', l.id) AS CHAR(100)) AS node_key,
          CAST(NULL AS CHAR(100)) AS parent_node_key,

          CAST(NULL AS SIGNED) AS id_laporan_relation,
          l.id AS id_laporan,

          CAST(NULL AS SIGNED) AS id_coa_type,
          CAST(NULL AS SIGNED) AS id_coa_subtype,
          CAST(NULL AS SIGNED) AS id_coa,

          CAST(
            COALESCE(lr_root.modifier, 1)
            AS DECIMAL(10,4)
          ) AS modifier,

          CAST(
            CONCAT('report_', l.id)
            AS CHAR(4000)
          ) AS path,

          CAST(NULL AS CHAR(4000)) AS relation_path,

          0 AS level,

          CAST('report' AS CHAR(20)) AS node_type,

          l.nama,
          l.keterangan

      FROM laporan l

      LEFT JOIN laporan_relation lr_root
          ON lr_root.id_parent = l.id
         AND lr_root.id_child IS NULL

      WHERE l.id = ?


      UNION ALL


      /* LAPORAN -> RELATION */

      SELECT
          CAST(
            CONCAT(
              'section_',
              lr.id,
              '_path_',
              SUBSTRING(
                MD5(
                  CONCAT(
                    t.path,
                    ',',
                    CONCAT('section_', lr.id)
                  )
                ),
                1,
                8
              )
            )
            AS CHAR(100)
          ) AS node_key,

          CAST(t.node_key AS CHAR(100)) AS parent_node_key,

          lr.id AS id_laporan_relation,
          lr.id_child AS id_laporan,

          lr.id_coa_type,
          lr.id_coa_subtype,
          lr.id_coa,

          CAST(
            COALESCE(lr.modifier, 1)
            AS DECIMAL(10,4)
          ) AS modifier,

          CONCAT(
            t.path,
            ',',
            CONCAT(
              'section_',
              lr.id,
              '_path_',
              SUBSTRING(
                MD5(
                  CONCAT(
                    t.path,
                    ',',
                    CONCAT('section_', lr.id)
                  )
                ),
                1,
                8
              )
            )
          ) AS path,

          CONCAT_WS(
            ',',
            t.relation_path,
            lr.id
          ) AS relation_path,

          t.level + 1 AS level,

          CAST(
            CASE
              WHEN c.id IS NOT NULL
                THEN 'coa'

              WHEN lr.id_coa_subtype IS NOT NULL
                THEN 'subtype'

              WHEN lr.id_coa_type IS NOT NULL
                THEN 'type'

              WHEN lr.id_child IS NOT NULL
                THEN 'section'
            END
            AS CHAR(20)
          ) AS node_type,

          COALESCE(
            c.nama,
            cs.nama,
            ct.nama,
            l.nama
          ) AS nama,

          COALESCE(
            c.keterangan,
            cs.keterangan,
            ct.keterangan,
            l.keterangan
          ) AS keterangan

      FROM tree t

      JOIN laporan_relation lr
          ON lr.id_parent = t.id_laporan

      LEFT JOIN coa c
          ON c.id = lr.id_coa
         ${coaCompanyCondition}

      LEFT JOIN coa_subtype cs
          ON cs.id = lr.id_coa_subtype

      LEFT JOIN coa_type ct
          ON ct.id = lr.id_coa_type

      LEFT JOIN laporan l
          ON l.id = lr.id_child

      WHERE t.node_type IN (
        'report',
        'section'
      )

      /*
       * Do not traverse the same relation twice
       * in the same branch.
       */
      AND (
        t.relation_path IS NULL
        OR FIND_IN_SET(
          lr.id,
          t.relation_path
        ) = 0
      )
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
              t.id_laporan_relation,
              '_path_',
              SUBSTRING(
                MD5(
                  CONCAT(
                    t.path,
                    ',',
                    'sub_',
                    cs.id,
                    '_rel_',
                    t.id_laporan_relation
                  )
                ),
                1,
                8
              )
            )
            AS CHAR(100)
          ) AS node_key,

          CAST(t.node_key AS CHAR(100)) AS parent_node_key,

          NULL AS id_laporan_relation,
          NULL AS id_laporan,

          NULL AS id_coa_type,
          cs.id AS id_coa_subtype,
          NULL AS id_coa,

          CAST(
            1
            AS DECIMAL(10,4)
          ) AS modifier,

          CONCAT(
            t.path,
            ',',
            CONCAT(
              'sub_',
              cs.id,
              '_rel_',
              t.id_laporan_relation,
              '_path_',
              SUBSTRING(
                MD5(
                  CONCAT(
                    t.path,
                    ',',
                    'sub_',
                    cs.id,
                    '_rel_',
                    t.id_laporan_relation
                  )
                ),
                1,
                8
              )
            )
          ) AS path,

          t.relation_path,

          t.level + 1 AS level,

          CAST(
            'subtype'
            AS CHAR(20)
          ) AS node_type,

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
              t.id_laporan_relation,
              '_path_',
              SUBSTRING(
                MD5(
                  CONCAT(
                    t.path,
                    ',',
                    'coa_',
                    c.id,
                    '_rel_',
                    t.id_laporan_relation
                  )
                ),
                1,
                8
              )
            )
            AS CHAR(100)
          ) AS node_key,

          CAST(t.node_key AS CHAR(100)) AS parent_node_key,

          NULL AS id_laporan_relation,
          NULL AS id_laporan,

          NULL AS id_coa_type,
          t.id_coa_subtype,
          c.id AS id_coa,

          CAST(
            1
            AS DECIMAL(10,4)
          ) AS modifier,

          CONCAT(
            t.path,
            ',',
            CONCAT(
              'coa_',
              c.id,
              '_rel_',
              t.id_laporan_relation,
              '_path_',
              SUBSTRING(
                MD5(
                  CONCAT(
                    t.path,
                    ',',
                    'coa_',
                    c.id,
                    '_rel_',
                    t.id_laporan_relation
                  )
                ),
                1,
                8
              )
            )
          ) AS path,

          t.relation_path,

          t.level + 1 AS level,

          CAST(
            'coa'
            AS CHAR(20)
          ) AS node_type,

          c.nama,

          NULL AS keterangan

      FROM tree t

      JOIN coa c
          ON c.id_coa_subtype = t.id_coa_subtype
         ${coaCompanyCondition}

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
              '_path_',
              SUBSTRING(
                MD5(e.path),
                1,
                8
              )
            )
            AS CHAR(100)
          ) AS node_key,

          CAST(e.node_key AS CHAR(100)) AS parent_node_key,

          NULL AS id_laporan_relation,
          NULL AS id_laporan,

          NULL AS id_coa_type,
          e.id_coa_subtype,
          c.id AS id_coa,

          CAST(
            1
            AS DECIMAL(10,4)
          ) AS modifier,

          CONCAT(
            e.path,
            ',',
            CONCAT(
              'coa_',
              c.id,
              '_sub_',
              e.id_coa_subtype,
              '_path_',
              SUBSTRING(
                MD5(e.path),
                1,
                8
              )
            )
          ) AS path,

          e.relation_path,

          e.level + 1 AS level,

          CAST(
            'coa'
            AS CHAR(20)
          ) AS node_type,

          c.nama,

          NULL AS keterangan

      FROM expanded e

      JOIN coa c
          ON c.id_coa_subtype = e.id_coa_subtype
         ${coaCompanyCondition}

      WHERE e.node_type = 'subtype'
        AND e.id_laporan_relation IS NULL
    ),


    node_nominal AS (

      SELECT
          e.node_key,

          COALESCE(
            SUM(
              CASE
                WHEN ct.normal_balance = 0
                  THEN -1
                ELSE 1
              END

              *

              CASE
                WHEN t.tipe = ct.normal_balance
                  THEN 1
                ELSE -1
              END

              *

              t.amount
            ),
            0
          ) AS own_nominal

      FROM expanded e

      INNER JOIN coa c
          ON c.id = e.id_coa
         ${coaCompanyCondition}

      INNER JOIN coa_subtype cs
          ON cs.id = c.id_coa_subtype

      INNER JOIN coa_type ct
          ON ct.id = cs.id_coa_type

      INNER JOIN transaksi t
          ON t.id_coa = c.id

      INNER JOIN jurnal j
          ON j.id = t.id_jurnal

      WHERE e.node_type = 'coa'

      ${filterClauses.length ? filterClauses.join("\n        ") : ""}

      GROUP BY e.node_key
    )


    SELECT
        e.node_key AS id,
        e.parent_node_key AS id_parent,

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
        e.relation_path,

        COALESCE(
          n.own_nominal,
          0
        ) AS own_nominal

    FROM expanded e

    LEFT JOIN node_nominal n
        ON n.node_key = e.node_key

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
        e.relation_path

    ORDER BY
        e.level,
        e.path;
  `;

  const [rows] = await conn.execute(query, values);

  const buildBranchBalances = (rows) => {
    const nodes = new Map();
    const children = new Map();

    for (const row of rows) {
      const node = {
        ...row,

        own_nominal: Number(row.own_nominal || 0),

        modifier: Number(row.modifier || 1),
      };

      nodes.set(node.id, node);

      if (node.id_parent != null) {
        const list = children.get(node.id_parent) || [];

        list.push(node);

        children.set(node.id_parent, list);
      }
    }

    const calculate = (node) => {
      const childTotal = (children.get(node.id) || []).reduce(
        (sum, child) => sum + calculate(child),
        0,
      );

      node.total_balance = (node.own_nominal + childTotal) * node.modifier;

      return node.total_balance;
    };

    for (const node of nodes.values()) {
      if (node.id_parent == null) {
        calculate(node);
      }
    }

    return [...nodes.values()];
  };

  let resultRows = includeBalance ? buildBranchBalances(rows) : rows;

  if (Array.isArray(nodeTypes) && nodeTypes.length) {
    resultRows = resultRows.filter((row) => nodeTypes.includes(row.node_type));
  }

  if (!includeBalance) {
    return resultRows.map(({ own_nominal, ...rest }) => rest);
  }

  return resultRows.map(({ own_nominal, ...rest }) => rest);
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
  customSelect: "",
  generateCustomJoin: (mainTable) => ``,
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
      const queryData = data || {};
      if (queryData.type === "tree") {
        return fetchTreeRows(
          {
            id,
            from: queryData.from,
            to: queryData.to,
            id_perusahaan: queryData.id_perusahaan,
            includeBalance: true,
          },
          conn,
        );
      }

      const query = `SELECT * FROM ${TABLE_NAME} WHERE id = ?`;
      const [rows] = await conn.execute(query, [id]);
      return rows[0];
    },
    async getCoasWithoutValue(id, data = {}, conn = db) {
      const rows = await fetchTreeRows(
        {
          id,
          id_perusahaan: data.id_perusahaan,
          includeBalance: false,
          nodeTypes: ["coa"],
        },
        conn,
      );

      return rows
        .filter((row) => row.id_coa != null)
        .map((row) => ({
          id_coa: row.id_coa,
          nama: row.nama,
        }));
    },
  },
});

export default Model;
