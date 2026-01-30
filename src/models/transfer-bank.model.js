import db from "../config/db.js";

const TABEL = "transfer_bank";

const TransferBank = {
  async create({
    id_metode_pembayaran_asal,
    id_metode_pembayaran_tujuan,
    tanggal,
    nominal,
    keterangan = "",
    created_by = null,
  }) {
    if (!id_metode_pembayaran_asal)
      throw new Error("Metode pembayaran asal wajib diisi");

    if (!id_metode_pembayaran_tujuan)
      throw new Error("Metode pembayaran tujuan wajib diisi");

    if (nominal <= 0) throw new Error("Nominal harus lebih dari 0");

    const sql = `
    INSERT INTO ${TABEL}
    (id_metode_pembayaran_asal, id_metode_pembayaran_tujuan, tanggal, nominal, keterangan, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

    const [result] = await db.execute(sql, [
      id_metode_pembayaran_asal,
      id_metode_pembayaran_tujuan,
      tanggal,
      nominal,
      keterangan,
      created_by,
    ]);

    return {
      id: result.insertId,
    };
  },

  async getAll({ limit, offset }) {
    const isPagination = limit && offset;
    const sql = `SELECT tb.*, mpa.nama metodepembayaranasal, mpt.nama metodepembayarantujuan, cb.nama pembuat, ub.nama pengedit FROM ${TABEL} tb
    left join metodepembayaran mpa on mpa.id=tb.id_metode_pembayaran_asal
    left join metodepembayaran mpt on mpt.id=tb.id_metode_pembayaran_tujuan
    left join karyawan cb on cb.id=tb.created_by 
    left join karyawan ub on ub.id=tb.updated_by 
    ${isPagination ? " limit ? offset ?" : ""}`;
    const [rows] = await db.execute(sql, [
      ...(isPagination ? [limit, offset] : []),
    ]);
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

    const allowedFields = [
      "id_metode_pembayaran_asal",
      "id_metode_pembayaran_tujuan",
      "nominal",
      "keterangan",
      "updated_by",
    ];
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
export default TransferBank;
