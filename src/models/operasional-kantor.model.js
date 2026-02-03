import db from "../config/db.js";

const TABEL = "operasionalkantor";

const OperasionalKantor = {
  async create({
    nama,
    keterangan = "",
    authorid_karyawan = null,
    lastid_karyawan = null,
  }) {
    const sql = `
      INSERT INTO ${TABEL} (nama, keterangan, authorid_karyawan, lastid_karyawan)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      nama,
      keterangan,
      authorid_karyawan,
      lastid_karyawan,
    ]);
    return result;
  },

  async sumByKategoriOperasional({ start, end }) {
    const sql = `SELECT ko.nama, sum(ok.biaya) pengeluaran, COUNT(ok.id) total FROM ${TABEL} ok
    left join kategorioperasionalkantor ko on ko.id=ok.id_kategorioperasionalkantor
    where ok.tanggal >= ?
    AND ok.tanggal <  ?
    group by ok.id_kategorioperasionalkantor, ko.nama`;
    const [rows] = await db.execute(sql, [start, end]);
    return rows;
  },

  async getById(id) {
    const sql = `SELECT * FROM ${TABEL} WHERE id = ?`;
    const [rows] = await db.execute(sql, [id]);
    return rows[0];
  },

  async patch(id, data) {
    const fields = [];
    const values = [];

    const allowedFields = ["nama", "keterangan", "lastid_karyawan"];
    for (const key in data) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    const sql = `
      UPDATE ${TABEL}
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    values.push(id);

    const [result] = await db.execute(sql, values);
    return result;
  },

  async delete(id) {
    const sql = `DELETE FROM ${TABEL} WHERE id = ?`;
    const [result] = await db.execute(sql, [id]);
    return result;
  },
};
export default OperasionalKantor;
