import db from "../config/db.js";

const TABEL = "metodepembayaran";

const MetodePembayaran = {
  async patch(id, data) {
    const fields = [];
    const values = [];

    const allowedFields = [
      "id_bank",
      "id_perusahaan",
      "norekening",
      "atasnama",
      "nama",
      "hide",
      "keterangan",
      "last_user",
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
};
export default MetodePembayaran;
