import db from "../config/db.js";

const ProyekModel = {
  async findAll() {
    const [rows] = await db.execute("SELECT * FROM proyek");
    return rows;
  },
  async findStagedProductByProjectId(id) {
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
        select kp.id idkategoriproduk, kp.nama kategoriproduk, pr.id, pr.id_kustom, pr.nama, pr.tipe, pr.keterangan, pr.stok, pr.satuan, pr.hargamodal, m.id idmerek, m.nama merek, k.total - coalesce(p.total,0) produkmenunggu
        from sumkeranjangproyek k
        left join sumpengeluaranproyek p on p.id_produk=k.id_produk
        left join produk pr on pr.id=k.id_produk
        left join merek m on m.id=pr.id_merek
        left join kategoriproduk kp on kp.id = pr.id_kategori
        order by kp.nama, pr.nama, m.nama, pr.tipe`,
      [id, id],
    );
    return rows;
  },
};
export default ProyekModel;
