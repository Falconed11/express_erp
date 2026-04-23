import db from "../../config/db.js";
import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "laporan";
const extraAllowedFields = ["id_parent", "id_coa_filter", "id_coa", "modifier"];
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
  const allowedValues = [1, -1];
  const { modifier, id_parent } = data;
  if (id_parent && !allowedValues.includes(+modifier))
    throw new Error("modifier harus 1, atau -1!");
  if (id_parent == null) data.modifier = null;
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
      `SELECT id, nama, id_parent FROM ${TABLE_NAME} WHERE id = ?`,
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
    currentId =
      currentNode.id_parent != null ? +currentNode.id_parent : currentNode.id_parent;
  }
};

const validateTreeRecursionFromRoot = async (rootId, conn = db) => {
  if (rootId == null) return;

  const [rows] = await conn.execute(
    `SELECT id, nama, id_parent FROM ${TABLE_NAME}`,
  );

  const nodeMap = new Map(
    rows.map((row) => [
      +row.id,
      {
        id: +row.id,
        nama: row.nama,
        id_parent: row.id_parent != null ? +row.id_parent : null,
      },
    ]),
  );

  const visitedGlobal = new Set();
  const walk = (currentId, stack = new Set()) => {
    if (currentId == null || visitedGlobal.has(currentId)) return;

    const currentNode = nodeMap.get(+currentId);
    if (!currentNode) return;

    if (stack.has(+currentNode.id)) {
      throw formatCycleError(currentNode);
    }

    stack.add(+currentNode.id);
    visitedGlobal.add(+currentNode.id);

    for (const node of nodeMap.values()) {
      if (node.id_parent === +currentNode.id) {
        walk(node.id, stack);
      }
    }

    stack.delete(+currentNode.id);
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
    left join laporan lp on lp.id=${mainTable}.id_parent
    left join coa_filter cf on cf.id=${mainTable}.id_coa_filter
    left join coa c on c.id=${mainTable}.id_coa
    left join coa_subtype cs on cs.id=c.id_coa_subtype
    left join coa_type ct on ct.id=cs.id_coa_type
  `,
  prepareData: prepareLaporanData,
  customModel: {
    async create(data, conn = db) {
      const preparedData = prepareLaporanData(data);
      await validateTreeRecursion({ id_parent: preparedData.id_parent }, conn);

      const filteredEntries = Object.entries(preparedData).filter(([key, value]) => {
        const isAllowedKey = allowedFieldsForCreate.includes(key);
        const hasValue = value !== null && value !== undefined && value !== "";
        return isAllowedKey && hasValue;
      });

      const fieldNames = filteredEntries.map(([key]) => key);
      const values = filteredEntries.map(([_, value]) => value);
      const placeholders = fieldNames.map(() => "?").join(", ");
      const sql = `INSERT INTO ${TABLE_NAME} (${fieldNames.join(", ")}) VALUES (${placeholders})`;
      const [result] = await conn.execute(sql, values);
      return result;
    },
    async patch(id, data, conn = db) {
      const preparedData = prepareLaporanData(data);
      await validateTreeRecursion({ id, id_parent: preparedData.id_parent }, conn);

      const fields = [];
      const values = [];
      for (const key in preparedData) {
        if (allowedFieldsForUpdate.includes(key)) {
          fields.push(`${key} = ?`);
          values.push(preparedData[key]);
        }
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
    async getById(id, data, conn = db) {
      const { from, to, id_perusahaan } = data;
      let sql = ``;
      const laporanTree = `SELECT l.id, l.id_parent, l.nama, l.id_coa_filter, l.id_coa, l.modifier, 0 AS level
        FROM laporan l
        WHERE l.id = ?
        UNION ALL
        SELECT c.id, c.id_parent, c.nama, c.id_coa_filter, c.id_coa, c.modifier, p.level + 1
        FROM laporan c
        JOIN laporan_tree p ON c.id_parent = p.id
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
        SELECT 1 FROM laporan child WHERE child.id_parent = lt.id
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
      const rollUp = `SELECT lb.laporan_id AS id, lb.id_parent, lb.nama, lb.level, lb.modifier, lb.balance
        FROM laporan_balance lb
        UNION ALL
        SELECT p.id, p.id_parent, p.nama, p.level, p.modifier, c.balance * COALESCE(c.modifier, 1)
        FROM laporan_tree p
        JOIN rollup c ON c.id_parent = p.id
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
