import db from "../config/db.js";
import { conditionalArrayBuilder, queryWhereBuilder } from "../utils/tools.js";

const table = "pengeluaranproyek";
const PengeluaranProyekModel = {
  async find({ idProyek }) {
    const [rows] = await db.execute(
      `SELECT pp.*, p.nama produk, p.tipe, p.satuan, m.nama merek, pm.harga hargaprodukmasuk, pm.terbayar-pm.jumlah*pm.harga hutang,
        CASE
          WHEN pp.id_produkkeluar IS NOT NULL THEN
            CASE
              WHEN (pm.terbayar-(pm.jumlah*pm.harga)) = 0 THEN 1
              ELSE 0
            END
          ELSE pp.status
        END AS lunas, 
      k.nama karyawan FROM ${table} pp
      left join produk p on p.id=pp.id_produk
      left join merek m on m.id=p.id_merek
      left join karyawan k on k.id=pp.id_karyawan
      left join produkkeluar pk on pk.id=pp.id_produkkeluar
      left join produkmasuk pm on pm.id=pk.id_produkmasuk
      where 1=1
      ${queryWhereBuilder(idProyek, "pp.id_proyek")}
      `,
      [...conditionalArrayBuilder(idProyek)],
    );
    return rows;
  },
};
export default PengeluaranProyekModel;
