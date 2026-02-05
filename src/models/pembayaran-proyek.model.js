import db from "../config/db.js";

const TABEL = "pembayaranproyek";

const PembayaranProyek = {
  async calculate({ start, end, aggregate }) {
    const sql = `
      SELECT COUNT(nominal) total, COALESCE(${aggregate}(nominal), 0) pendapatan FROM ${TABEL}
      where 1=1
      AND tanggal >= ?
      AND tanggal < ?
      `;
    const [rows] = await db.execute(sql, [start, end]);
    return rows[0];
  },
  async getAll() {
    const sql = `select * from ${TABEL}`;
    const [rows] = await db.execute(sql);
    return rows;
  },
};
export default PembayaranProyek;
