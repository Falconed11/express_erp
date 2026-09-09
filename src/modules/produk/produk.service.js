import db from "../../config/db.js";
import produkRepo from "../../../repositories/produk.cjs";
import Model from "./produk.model.js";
import { findProductCandidates } from "./produk-matching.service.js";
import { buildProductAuditEntries } from "./produk-audit.util.js";
import { getIndonesiaDateTime } from "../../utils/audit.util.js";

const AUDIT_TABLE = "audit_log";

const formatAuditDateTime = (value) => {
  if (!value) return null;
  const source =
    value instanceof Date
      ? `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}T${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}:${String(value.getUTCSeconds()).padStart(2, "0")}Z`
      : `${String(value).replace(" ", "T").replace(/Z$/, "")}Z`;
  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(source));
  return `${formatted} WIB`;
};

const saveProductAuditEntries = async (entries) => {
  if (!entries || entries.length === 0) return [];
  const placeholders = entries.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
  const values = entries.flatMap((entry) => [
    entry.table_name,
    entry.record_id,
    entry.action,
    JSON.stringify(entry.changes),
    entry.changed_by ?? null,
    entry.changed_at ?? getIndonesiaDateTime(),
  ]);
  const sql = `INSERT INTO ${AUDIT_TABLE} (table_name, record_id, action, changes, changed_by, changed_at) VALUES ${placeholders}`;
  await db.execute(sql, values);
  return entries;
};

const getAuditProductState = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM produk WHERE id = ? LIMIT 1`, [
    id,
  ]);
  return rows[0] || null;
};

const Service = {
  async getAll(filters) {
    return produkRepo.list(filters);
  },

  async getCandidates({ nama = "", merek = "", tipe = "" }) {
    if (!nama.trim() && !merek.trim() && !tipe.trim()) return [];
    const products = await produkRepo.list({ aktif: 1 });
    return findProductCandidates(products, { nama, merek, tipe });
  },

  async create(data) {
    return produkRepo.create(data);
  },

  async getById(id) {
    const result = await produkRepo.list({ id });
    if (!result || result.length === 0) {
      throw new Error("Data not found");
    }
    return result[0];
  },

  async getAuditLogs({
    id_produk,
    action,
    changed_by,
    date_from,
    date_to,
  } = {}) {
    const where = [];
    const values = [];
    where.push("pal.table_name = ?");
    values.push("produk");

    if (id_produk) {
      where.push("pal.record_id = ?");
      values.push(id_produk);
    }
    if (["update", "delete"].includes(action)) {
      where.push("pal.action = ?");
      values.push(action);
    }
    if (changed_by) {
      where.push("pal.changed_by = ?");
      values.push(changed_by);
    }
    if (date_from) {
      where.push("pal.changed_at >= ?");
      values.push(`${date_from} 00:00:00`);
    }
    if (date_to) {
      where.push("pal.changed_at <= ?");
      values.push(`${date_to} 23:59:59`);
    }

    const [rows] = await db.execute(
      `SELECT pal.*, k.nama AS changed_by_name
       FROM ${AUDIT_TABLE} pal
       LEFT JOIN karyawan k ON k.id = pal.changed_by
       ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY pal.changed_at DESC, pal.id DESC
       LIMIT 500`,
      values,
    );

    return rows.map((row) => ({
      ...row,
      changed_at_wib: formatAuditDateTime(row.changed_at),
      id_produk: row.record_id,
      changes:
        typeof row.changes === "string"
          ? JSON.parse(row.changes)
          : row.changes || {},
    }));
  },

  async patch(id, data) {
    const before = await getAuditProductState(id);
    if (!before) throw new Error("Data not found");

    const result = await Model.patch(id, data);
    if (!result || result.affectedRows === 0) {
      throw new Error("No data updated");
    }

    const after = await getAuditProductState(id);
    const entries = buildProductAuditEntries({
      id_produk: id,
      action: "update",
      before,
      after,
      changed_by: data.updated_by ?? data.changed_by ?? null,
      changed_at: getIndonesiaDateTime(),
    });

    await saveProductAuditEntries(entries);
    return result;
  },

  async destroy(id, actorId = null) {
    const before = await getAuditProductState(id);
    if (!before) throw new Error("Data not found");

    const result = await produkRepo.destroy({ id, changed_by: actorId });
    if (!result || result.affectedRows === 0) {
      throw new Error("Data not found");
    }

    return result;
  },

  async listKategori() {
    return produkRepo.listKategori();
  },

  async transfer(data) {
    return produkRepo.transfer(data);
  },
};

export default Service;
