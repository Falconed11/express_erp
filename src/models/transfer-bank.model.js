import db from "../config/db.js";
import {
  buildQueryCount,
  conditionalArrayBuilder,
  queryWhereBuilder,
} from "../utils/tools.js";

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

  async get({
    aggregate,
    limit,
    offset,
    id_metode_pembayaran_asal,
    id_metode_pembayaran_tujuan,
    id_perusahaan_asal,
    id_perusahaan_tujuan,
    exclude_id_perusahaan_asal,
    exclude_id_perusahaan_tujuan,
    from,
    to,
    conn = db,
  }) {
    const isPagination = limit && offset != null;
    const sql = `SELECT ${aggregate ? `${buildQueryCount(aggregate, "tb.nominal", "totalValue")}, ` : ""} tb.*, mpa.nama metodepembayaranasal, mpt.nama metodepembayarantujuan, cb.nama pembuat, ub.nama pengedit FROM ${TABEL} tb
    join metodepembayaran mpa on mpa.id=tb.id_metode_pembayaran_asal ${queryWhereBuilder(id_metode_pembayaran_asal, "mpa.id")}
    join metodepembayaran mpt on mpt.id=tb.id_metode_pembayaran_tujuan ${queryWhereBuilder(id_metode_pembayaran_tujuan, "mpt.id")}
    left join perusahaan pa on pa.id=mpa.id_perusahaan
    left join perusahaan pt on pt.id=mpt.id_perusahaan
    left join karyawan cb on cb.id=tb.created_by 
    left join karyawan ub on ub.id=tb.updated_by 
    where 1=1
    ${queryWhereBuilder(id_perusahaan_asal, "pa.id")} ${exclude_id_perusahaan_asal ? "and not (pa.id<=>?)" : ""}
    ${queryWhereBuilder(id_perusahaan_tujuan, "pt.id")} ${exclude_id_perusahaan_tujuan ? "and not (pt.id<=>?)" : ""}
    ${queryWhereBuilder(from, "tb.tanggal", ">=")}
    ${queryWhereBuilder(to, "tb.tanggal", "<")}
    order by tb.tanggal desc
    ${isPagination ? " limit ? offset ?" : ""}
    `;
    const values = [
      ...conditionalArrayBuilder(id_metode_pembayaran_asal),
      ...conditionalArrayBuilder(id_metode_pembayaran_tujuan),
      ...conditionalArrayBuilder(id_perusahaan_asal),
      ...conditionalArrayBuilder(exclude_id_perusahaan_asal),
      ...conditionalArrayBuilder(id_perusahaan_tujuan),
      ...conditionalArrayBuilder(exclude_id_perusahaan_tujuan),
      ...conditionalArrayBuilder(from),
      ...conditionalArrayBuilder(to),
      ...(isPagination ? [limit, offset] : []),
    ];
    const [rows] = await conn.execute(sql, values);
    if (aggregate) return rows[0];
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
