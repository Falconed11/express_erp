import { generateStandardCRUDModel } from "../default/default.model.js";
import db from "../../config/db.js";

const TABLE_NAME = "produk";
const extraAllowedFields = [
  "id_kategori",
  "id_kustom",
  "id_merek",
  "tipe",
  "id_vendor",
  "stok",
  "satuan",
  "hargamodal",
  "hargajual",
  "hargabatas",
  "main_vendor",
  "tanggal",
  "jatuhtempo",
  "terbayar",
  "lunas",
  "keterangan",
  "manualinput",
];

const Model = {
  ...generateStandardCRUDModel({
    tableName: TABLE_NAME,
    extraAllowedFieldsForCreate: extraAllowedFields,
    extraAllowedFieldsForUpdate: extraAllowedFields,
  }),
  async getStockCount() {
    const [rows] = await db.execute(
      "SELECT COUNT(*) AS count FROM produk WHERE stok > 0",
    );
    return Number(rows[0]?.count ?? 0);
  },
  async getStockEntriesForExport() {
    const [rows] = await db.execute(`
      SELECT
        kp.nama AS kategori,
        p.nama AS produk,
        m.nama AS merek,
        p.tipe,
        v.nama AS vendor,
        pm.jumlah - COALESCE(pm.keluar, 0) AS jumlah_keluar,
        p.satuan,
        pm.harga AS harga_modal,
        (pm.jumlah - COALESCE(pm.keluar, 0)) * pm.harga AS total_modal
      FROM produkmasuk pm
      INNER JOIN produk p ON p.id = pm.id_produk
      LEFT JOIN kategoriproduk kp ON kp.id = p.id_kategori
      LEFT JOIN merek m ON m.id = p.id_merek
      LEFT JOIN vendor v ON v.id = pm.id_vendor
      WHERE pm.jumlah > COALESCE(pm.keluar, 0)
      ORDER BY kp.nama, p.nama, pm.tanggal DESC, pm.id
    `);
    return rows;
  },
  async getPage({
    id,
    kategori,
    merek,
    aktif,
    isReadyStock,
    nama,
    id_kustom,
    id_perusahaan,
    page = 1,
    pageSize = 25,
  } = {}) {
    const conditions = ["p.tanggal >= ?"];
    const values = ["2025-01-01"];

    if (id) {
      conditions.push("p.id = ?");
      values.push(id);
    }
    if (kategori) {
      conditions.push("p.id_kategori = ?");
      values.push(kategori);
    }
    if (merek) {
      conditions.push("p.id_merek = ?");
      values.push(merek);
    }
    if (aktif === "0" || aktif === "1") {
      conditions.push("p.aktif = ?");
      values.push(aktif);
    }
    if (isReadyStock === "true" || isReadyStock === "1") {
      conditions.push("p.stok > 0");
    }

    const customId = String(id_kustom ?? "").trim();
    if (customId) {
      conditions.push("LOWER(COALESCE(p.id_kustom, '')) LIKE ?");
      values.push(`%${customId.toLowerCase()}%`);
    }

    const searchTerms = String(nama ?? "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (searchTerms.length > 0) {
      const searchColumns = [
        "p.nama",
        "m.nama",
        "p.tipe",
        "p.keterangan",
        "p.id_kustom",
      ];
      conditions.push(
        `(${searchTerms
          .flatMap(() =>
            searchColumns.map(
              (column) => `LOWER(COALESCE(${column}, '')) LIKE ?`,
            ),
          )
          .join(" OR ")})`,
      );
      values.push(
        ...searchTerms.flatMap((term) => searchColumns.map(() => `%${term}%`)),
      );
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM ${TABLE_NAME} p
       LEFT JOIN merek m ON m.id = p.id_merek
       ${where}`,
      values,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const normalizedPageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(pageSize, 10) || 25),
    );
    const totalPages = Math.ceil(total / normalizedPageSize);
    const requestedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const currentPage = Math.min(requestedPage, Math.max(totalPages, 1));
    const offset = (currentPage - 1) * normalizedPageSize;

    const [items] = await db.execute(
      `SELECT
         p.*,
         COALESCE(psp.stok, 0) AS stok_perusahaan,
         kp.nama AS kategoriproduk,
         m.nama AS nmerek,
         v.nama AS nvendor,
         mv.nama AS nmain_vendor,
         (SELECT COUNT(DISTINCT kpy.id_proyek)
            FROM keranjangproyek kpy WHERE kpy.id_produk = p.id) AS nkeranjangproyek,
         (SELECT COUNT(*) FROM produkmasuk pm WHERE pm.id_produk = p.id) AS nprodukmasuk,
         (SELECT COUNT(*) FROM pengeluaranproyek pp WHERE pp.id_produk = p.id) AS npengeluaranproyek
       FROM ${TABLE_NAME} p
       LEFT JOIN merek m ON m.id = p.id_merek
       LEFT JOIN vendor v ON v.id = p.id_vendor
       LEFT JOIN vendor mv ON mv.id = p.main_vendor
       LEFT JOIN kategoriproduk kp ON kp.id = p.id_kategori
       LEFT JOIN produkstokperusahaan psp
         ON psp.id_produk = p.id AND psp.id_perusahaan = ?
       ${where}
       ORDER BY p.tanggal DESC, kategoriproduk, p.nama, m.nama, p.id
       LIMIT ? OFFSET ?`,
      [id_perusahaan ?? null, ...values, normalizedPageSize, offset],
    );

    return {
      items,
      total,
      page: currentPage,
      pageSize: normalizedPageSize,
      totalPages,
    };
  },
  async cleanStock() {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [stockInResult] = await connection.execute(
        "UPDATE produkmasuk SET jumlah = COALESCE(keluar, 0) WHERE jumlah > COALESCE(keluar, 0)",
      );
      const [stockResetResult] = await connection.execute(
        "UPDATE produk SET stok = 0 WHERE stok > 0",
      );
      const [productResult] = await connection.execute(
        "UPDATE produk SET aktif = 0 WHERE aktif = 1",
      );

      await connection.commit();
      transactionStarted = false;
      return {
        stockEntriesUpdated: stockInResult.affectedRows,
        productsStockReset: stockResetResult.affectedRows,
        productsDeactivated: productResult.affectedRows,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          error.rollbackError = rollbackError;
        }
      }
      throw error;
    } finally {
      connection.release();
    }
  },
};

export default Model;
