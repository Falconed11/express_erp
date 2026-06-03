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
      const laporanTree = `SELECT l.id, CAST(NULL AS SIGNED) AS id_parent, l.nama, rm.id_coa_filter, rm.id_coa, rm.modifier, 0 AS level,
          CAST(CONCAT(',', l.id, ',') AS CHAR(5000)) AS path
        FROM laporan l
        LEFT JOIN laporan_relation rm ON rm.id_parent = l.id AND rm.id_child IS NULL
        WHERE l.id = ?
        UNION ALL
        SELECT c.id, p.id AS id_parent, c.nama, rm2.id_coa_filter, rm2.id_coa, rm2.modifier, p.level + 1,
          CONCAT(p.path, c.id, ',') AS path
        FROM laporan c
        JOIN laporan_relation rel ON rel.id_child = c.id
        JOIN laporan_tree p ON p.id = rel.id_parent
        LEFT JOIN laporan_relation rm2 ON rm2.id_parent = c.id AND rm2.id_child IS NULL
        WHERE INSTR(p.path, CONCAT(',', c.id, ',')) = 0
      `;
      const laporanCoa = `-- 1. DIRECT COA (HIGHEST PRIORITY)
      SELECT lt.id AS laporan_id, lt.id_parent, lt.nama, lt.level, lt.modifier, lt.id_coa AS coa_id
      FROM laporan_tree lt
      WHERE lt.id_coa IS NOT NULL
      UNION ALL
      -- 2. FILTER → DIRECT COA
      SELECT lt.id, lt.id_parent, lt.nama, lt.level, lt.modifier, cfm.id_coa
      FROM laporan_tree lt
      JOIN coa_filter_map cfm ON cfm.id_coa_filter = lt.id_coa_filter
      WHERE lt.id_coa IS NULL
      AND cfm.id_coa IS NOT NULL
      UNION ALL
      -- 3. FILTER → SUBTYPE
      SELECT lt.id, lt.id_parent, lt.nama, lt.level, lt.modifier, c.id AS coa_id
      FROM laporan_tree lt
      JOIN coa_filter_map cfm ON cfm.id_coa_filter = lt.id_coa_filter
      JOIN coa c ON c.id_coa_subtype = cfm.id_coa_subtype
      WHERE lt.id_coa IS NULL
      AND cfm.id_coa IS NULL
      AND cfm.id_coa_subtype IS NOT NULL
      UNION ALL
      -- 4. FILTER → TYPE
      SELECT lt.id, lt.id_parent, lt.nama, lt.level, lt.modifier, c.id AS coa_id
      FROM laporan_tree lt
      JOIN coa_filter_map cfm ON cfm.id_coa_filter = lt.id_coa_filter
      JOIN coa_subtype cs ON cs.id_coa_type = cfm.id_coa_type
      JOIN coa c ON c.id_coa_subtype = cs.id
      WHERE lt.id_coa IS NULL
      AND cfm.id_coa IS NULL
      AND cfm.id_coa_subtype IS NULL
      AND cfm.id_coa_type IS NOT NULL
      UNION ALL
      -- 5. FALLBACK (LEAF ONLY, NO COA / FILTER)
      SELECT lt.id, lt.id_parent, lt.nama, lt.level, lt.modifier, NULL AS coa_id
      FROM laporan_tree lt
      WHERE lt.id_coa IS NULL
      AND (
        lt.id_coa_filter IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM coa_filter_map cfm 
          WHERE cfm.id_coa_filter = lt.id_coa_filter
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM laporan_relation rel WHERE rel.id_parent = lt.id AND rel.id_child IS NOT NULL
      )
      `;
      const laporanCoaDistinct = `SELECT laporan_id, id_parent, nama, level, modifier, coa_id
      FROM (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY laporan_id, coa_id
            ORDER BY laporan_id
          ) AS rn
        FROM laporan_coa
      ) x
      WHERE rn = 1
      `;
      const laporanBalance = `SELECT lc.laporan_id, lc.id_parent, lc.nama, lc.level, lc.modifier,
          COALESCE(SUM(
            CASE 
              WHEN j.id IS NOT NULL THEN
                  CASE 
                    WHEN t.tipe = COALESCE(ct.normal_balance, 1) THEN t.amount
                    ELSE -t.amount
                  END
              ELSE 0
            END
          ), 0) AS balance
        FROM laporan_coa_distinct lc
        LEFT JOIN transaksi t ON t.id_coa = lc.coa_id
        LEFT JOIN coa c ON c.id = lc.coa_id
        LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
        LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
        LEFT JOIN jurnal j ON j.id = t.id_jurnal
          ${id_perusahaan ? "AND j.id_perusahaan = ?" : ""}
          ${from ? "AND j.tanggal >= ?" : ""}
          ${to ? "AND j.tanggal < ?" : ""}
        GROUP BY lc.laporan_id, lc.id_parent, lc.nama, lc.level, lc.modifier
      `;
      const rollUp = `SELECT lb.laporan_id AS id, lb.id_parent, lb.nama, lb.level, lb.modifier, lb.balance,
          CAST(CONCAT(',', lb.laporan_id, ',') AS CHAR(5000)) AS path
        FROM laporan_balance lb
        UNION ALL
        SELECT p.id, p.id_parent, p.nama, p.level, p.modifier, c.balance * COALESCE(c.modifier, 1),
          CONCAT(c.path, p.id, ',') AS path
        FROM laporan_tree p
        JOIN rollup c ON c.id_parent = p.id
        WHERE INSTR(c.path, CONCAT(',', p.id, ',')) = 0
      `;
      const result = `SELECT id, id_parent, nama, level, modifier, SUM(balance) AS total_balance
        FROM rollup
        GROUP BY id, id_parent, nama, level, modifier
        ORDER BY level, id
      `;
      if (data.type == "tree") {
        await validateTreeRecursionFromRoot(id, conn);
        sql = `WITH RECURSIVE laporan_tree AS (${laporanTree}),
        /* COA RESOLUTION (STRICT PRIORITY) */
        laporan_coa AS (${laporanCoa}),
        /* COA DEDUPLICATION LAYER */
        laporan_coa_distinct AS (${laporanCoaDistinct}),
        /* TRANSACTION AGGREGATION */
        laporan_balance AS (${laporanBalance}),
        /* ROLLUP */
        rollup AS (${rollUp})
        /* FINAL RESULT */
        ${result}
        `;
        const value = [
          id,
          ...(id_perusahaan ? [id_perusahaan] : []),
          ...(from ? [from] : []),
          ...(to ? [to] : []),
        ];
        const [rows] = await conn.execute(sql, value);
        return rows;
      }
      sql = `SELECT * FROM ${TABLE_NAME} WHERE id = ?`;
      const [rows] = await conn.execute(sql, [id]);
      return rows[0];
    },
  },
});

export default Model;
