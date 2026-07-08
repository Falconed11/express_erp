import db from "../../config/db.js";
import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./jurnal-expression.model.js";

// Map filter_type to table names
const FILTER_TYPE_TABLE_MAP = {
  laporan: "laporan",
  type: "coa_type",
  subtype: "coa_subtype",
  coa: "coa_filter",
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
      // Validate filter exists before updating (if id_filter or filter_type is being updated)
      if (data.id_filter !== undefined || data.filter_type !== undefined) {
        // Get current record to use existing values if not provided
        const current = await Model.getById(id);
        const id_filter = data.id_filter ?? current.id_filter;
        const filter_type = data.filter_type ?? current.filter_type;

        await validateFilterExists(id_filter, filter_type);
      }

      const result = await Model.patch(id, data);
      if (result.affectedRows === 0) {
        throw new Error("No data updated");
      }
      return result;
    },
  },
});

export default Service;
