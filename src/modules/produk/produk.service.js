import db from "../../config/db.js";
import produkRepo from "../../../repositories/produk.cjs";
import priceHistoryRepo from "./produk-price-history.repository.js";
import Model from "./produk.model.js";
import {
  rankCandidates,
  DEFAULT_FIELD_CONFIG,
} from "../similarity/similarity.service.js";
import { buildProductAuditEntries } from "./produk-audit.util.js";
import { getIndonesiaDateTime } from "../../utils/audit.util.js";

const AUDIT_TABLE = "audit_log";
const PRICE_HISTORY_PAGE_SIZE_MAX = 100;

const invalidPriceHistory = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeHistoryId = (value, fieldName) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw invalidPriceHistory(`${fieldName} tidak valid.`);
  return id;
};

const normalizeOptionalHistoryId = (value, fieldName) =>
  value === null || value === undefined || value === ""
    ? null
    : normalizeHistoryId(value, fieldName);

const normalizeHistoryDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw invalidPriceHistory("Tanggal harga tidak valid.");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw invalidPriceHistory("Tanggal harga tidak valid.");
  return value;
};

const normalizePriceHistory = (input, actorId, existing = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw invalidPriceHistory("Data riwayat harga tidak valid.");
  if (
    input.harga === "" ||
    (input.harga === undefined && existing.harga === undefined)
  )
    throw invalidPriceHistory("Harga modal wajib diisi.");
  const harga = Number(input.harga ?? existing.harga);
  if (!Number.isFinite(harga) || harga < 0)
    throw invalidPriceHistory("Harga modal harus berupa angka nol atau lebih.");
  if (
    input.aktif !== undefined &&
    ![0, 1, false, true, "0", "1"].includes(input.aktif)
  )
    throw invalidPriceHistory("Status riwayat harga tidak valid.");

  return {
    id_produk: normalizeHistoryId(
      Object.hasOwn(input, "id_produk") ? input.id_produk : existing.id_produk,
      "Produk",
    ),
    id_vendor: normalizeOptionalHistoryId(
      Object.hasOwn(input, "id_vendor") ? input.id_vendor : existing.id_vendor,
      "Vendor",
    ),
    id_perusahaan: normalizeOptionalHistoryId(
      Object.hasOwn(input, "id_perusahaan")
        ? input.id_perusahaan
        : existing.id_perusahaan,
      "Perusahaan",
    ),
    tanggal: normalizeHistoryDate(
      Object.hasOwn(input, "tanggal") ? input.tanggal : existing.tanggal,
    ),
    harga,
    keterangan:
      String(
        Object.hasOwn(input, "keterangan")
          ? (input.keterangan ?? "")
          : (existing.keterangan ?? ""),
      ).trim() || null,
    aktif:
      input.aktif === undefined
        ? Number(existing.aktif ?? 1)
        : Number(input.aktif),
    created_by: actorId,
    updated_by: actorId,
  };
};

const normalizeHistoryFilters = (filters = {}) => {
  const parseFilterId = (value, fieldName) =>
    value ? normalizeHistoryId(value, fieldName) : null;
  const pageSize = Math.min(
    PRICE_HISTORY_PAGE_SIZE_MAX,
    Math.max(1, Number.parseInt(filters.pageSize, 10) || 25),
  );
  return {
    productId: parseFilterId(filters.id_produk, "Produk"),
    vendorId: parseFilterId(filters.id_vendor, "Vendor"),
    search: String(filters.search ?? "").trim(),
    active: ["0", "1"].includes(String(filters.aktif))
      ? String(filters.aktif)
      : "all",
    dateFrom: filters.date_from
      ? normalizeHistoryDate(filters.date_from)
      : null,
    dateTo: filters.date_to ? normalizeHistoryDate(filters.date_to) : null,
    page: Math.max(1, Number.parseInt(filters.page, 10) || 1),
    pageSize,
  };
};

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
  async getStockCount() {
    return { count: await Model.getStockCount() };
  },
  async getStockEntriesForExport() {
    return Model.getStockEntriesForExport();
  },
  async getPage(filters) {
    return Model.getPage(filters);
  },
  async cleanStock() {
    return Model.cleanStock();
  },

  async getAll(filters = {}) {
    const rows = await produkRepo.list(filters);

    const searchInput = {
      nama: filters.nama ?? filters.search ?? "",
      merek: filters.merek ?? "",
      id_kustom: filters.id_kustom ?? "",
      tipe: filters.tipe ?? "",
    };

    const hasSearchSignal = Object.values(searchInput).some((value) =>
      String(value ?? "").trim(),
    );

    if (!hasSearchSignal) return rows;

    const limit = Number.isFinite(Number(filters.limit))
      ? Number(filters.limit)
      : 8;

    return rankCandidates(rows, searchInput, DEFAULT_FIELD_CONFIG, limit);
  },

  async getCandidates({ nama = "", merek = "", tipe = "", id_kustom = "" }) {
    if (!nama.trim() && !merek.trim() && !tipe.trim() && !id_kustom.trim())
      return [];
    const products = await produkRepo.list({ aktif: 1 });
    return rankCandidates(
      products,
      { nama, merek, id_kustom, tipe },
      DEFAULT_FIELD_CONFIG,
      8,
    );
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

  async getPriceHistory(filters) {
    return priceHistoryRepo.list(normalizeHistoryFilters(filters));
  },

  async createPriceHistory(input, actorId = null) {
    const data = normalizePriceHistory(input, actorId);
    return priceHistoryRepo.create(data);
  },

  async updatePriceHistory(id, input, actorId = null) {
    const historyId = normalizeHistoryId(id, "Riwayat harga");
    const existing = await priceHistoryRepo.getById(historyId);
    if (!existing) {
      const error = new Error("Riwayat harga tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }
    const data = normalizePriceHistory(input, actorId, existing);
    await priceHistoryRepo.update(historyId, data);
    return { id: historyId };
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
