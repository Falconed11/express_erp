import db from "../config/db.js";
import { conditionalArrayBuilder, queryWhereBuilder } from "../utils/tools.js";

const table = "pembayaranproyek";
const buildPembayaranProyek = ({
  proyek = null,
}) => `SELECT pp.*, mp.nama metodepembayaran, b.nama bank FROM ${table} pp
      left join metodepembayaran mp on mp.id=pp.id_metodepembayaran
      left join bank b on b.id=mp.id_bank
      where 1=1
      ${queryWhereBuilder(proyek, "pp.id_proyek")}
      `;
const PembayaranProyekModel = {
  async find({ proyek }) {
    const [rows] = await db.execute(buildPembayaranProyek({ proyek }), [
      ...conditionalArrayBuilder(proyek),
    ]);
    return rows;
  },
  buildPembayaranProyek,
};
export default PembayaranProyekModel;
