import db from "../../config/db.js";
import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./jurnal-expression.model.js";
import { withTransaction } from "../../helpers/transaction.js";
import { assertNotSystemGenerated } from "./system-seed-guard.js";

// Map filter_type to table names
const FILTER_TYPE_TABLE_MAP = {
  laporan: "laporan",
  type: "coa_type",
  subtype: "coa_subtype",
  coa: "coa",
};

const validateFilterExists = async (id_filter, filter_type, conn = db) => {
  if (!id_filter || !filter_type) {
    return; // Skip validation if either is null/undefined
  }

  const tableName = FILTER_TYPE_TABLE_MAP[filter_type];
  if (!tableName) {
    throw new Error(
      `Invalid filter_type: ${filter_type}. Valid types are: ${Object.keys(FILTER_TYPE_TABLE_MAP).join(", ")}`,
    );
  }

  const sql = `SELECT id FROM ${tableName} WHERE id = ? LIMIT 1`;
  const [rows] = await conn.execute(sql, [id_filter]);

  if (!rows || rows.length === 0) {
    throw new Error(
      `Filter dengan id ${id_filter} tidak ditemukan di table ${tableName}`,
    );
  }
};

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {
    async create(data) {
      // Validate filter exists before creating
      await validateFilterExists(data.id_filter, data.filter_type);
      return Model.create(data);
    },

    async patch(id, data) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          `SELECT je.nama, je.keterangan, je.id_filter, je.filter_type,
             EXISTS (
               SELECT 1
               FROM jurnal_form_expression jfe
               JOIN jurnal_form jf ON jf.id = jfe.id_jurnal_form
               WHERE jfe.id_jurnal_expression = je.id
                 AND jf.system_key IS NOT NULL
                 AND jf.system_key <> ''
             ) system_form_linked
           FROM jurnal_expression je
           WHERE je.id = ? LIMIT 1 FOR UPDATE`,
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemGenerated(current, "Jurnal Expression");

        if (data.id_filter !== undefined || data.filter_type !== undefined) {
          const id_filter = data.id_filter ?? current.id_filter;
          const filter_type = data.filter_type ?? current.filter_type;

          await validateFilterExists(id_filter, filter_type, conn);
        }

        const result = await Model.patch(id, data, conn);
        if (result.affectedRows === 0) {
          throw new Error("No data updated");
        }
        return result;
      });
    },
    async destroy(id) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          `SELECT je.nama, je.keterangan,
             EXISTS (
               SELECT 1
               FROM jurnal_form_expression jfe
               JOIN jurnal_form jf ON jf.id = jfe.id_jurnal_form
               WHERE jfe.id_jurnal_expression = je.id
                 AND jf.system_key IS NOT NULL
                 AND jf.system_key <> ''
             ) system_form_linked
           FROM jurnal_expression je
           WHERE je.id = ? LIMIT 1 FOR UPDATE`,
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemGenerated(current, "Jurnal Expression");
        return Model.destroy(id, conn);
      });
    },
  },
});

export default Service;
