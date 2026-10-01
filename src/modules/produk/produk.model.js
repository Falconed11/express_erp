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
  async cleanStock() {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [stockInResult] = await connection.execute(
        "UPDATE produkmasuk SET jumlah = COALESCE(keluar, 0) WHERE jumlah > COALESCE(keluar, 0)",
      );
      const [productResult] = await connection.execute(
        "UPDATE produk SET stok = 0, aktif = 0 WHERE stok > 0",
      );

      await connection.commit();
      transactionStarted = false;
      return {
        stockEntriesUpdated: stockInResult.affectedRows,
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
