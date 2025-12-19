import db from "../config/db.js";
import { withTransaction } from "../helpers/transaction.js";

export const findAll = async () => {
  const [rows] = await db.execute("SELECT * FROM proyek");
  return rows;
};

export const findStagedProductByProjectId = async (id) => {
  const [rows] = await db.execute(
    `With sumkeranjangproyek as (
        select id_produk, sum(jumlah) total
        from keranjangproyek
        where id_proyek=?
        group by id_produk
        ),
        sumpengeluaranproyek as (
        select id_produk, sum(jumlah) total
        from pengeluaranproyek
        where id_proyek=?
        group by id_produk
        )
        select pr.id, pr.nama, pr.tipe, pr.keterangan, pr.stok, m.nama nmerek, k.total - coalesce(p.total,0) produkmenunggu
        from sumkeranjangproyek k
        left join sumpengeluaranproyek p on p.id_produk=k.id_produk
        left join produk pr on pr.id=k.id_produk
        left join merek m on m.id=pr.id_merek`,
    [id, id]
  );
  return rows;
};
