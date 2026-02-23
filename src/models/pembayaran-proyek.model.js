import db from "../config/db.js";
import { conditionalArrayBuilder, queryWhereBuilder } from "../utils/tools.js";

const table = "pembayaranproyek";
const PembayaranProyekModel = {
  async find({ proyek }) {
    const [rows] = await db.execute(
      `SELECT pp.*, mp.nama metodepembayaran FROM ${table} pp
      left join metodepembayaran mp on mp.id=pp.id_metodepembayaran
      where 1=1
      ${queryWhereBuilder(proyek, "pp.id_proyek")}
      `,
      [...conditionalArrayBuilder(proyek)],
    );
    return rows;
  },
};
export default PembayaranProyekModel;
