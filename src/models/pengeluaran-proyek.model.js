import db from "../config/db.js";
import { conditionalArrayBuilder, queryWhereBuilder } from "../utils/tools.js";

const table = "pengeluaranproyek";
const PengeluaranProyekModel = {
  async find({ idProyek }) {
    const [rows] = await db.execute(
      `SELECT pp.*, p.nama produk, p.tipe, p.satuan, m.nama merek FROM ${table} pp
      left join produk p on p.id=pp.id_produk
      left join merek m on m.id=p.id_merek
      where 1=1
      ${queryWhereBuilder(idProyek, "id_proyek")}
      `,
      [...conditionalArrayBuilder(idProyek)],
    );
    return rows;
  },
};
export default PengeluaranProyekModel;
