import db from "../config/db.js";
import { conditionalArrayBuilder, queryWhereBuilder } from "../utils/tools.js";

const buildLeftJoin = (
  mainTable,
) => `left join instansi i on i.id=${mainTable}.id_instansi
left join perusahaan p on p.id=${mainTable}.id_perusahaan`;
const select = "i.nama instansi, i.swasta, p.nama perusahaan";
const buildCalculatePengeluaranById = ({
  aggregate,
  id = null,
  lunas = null,
}) => `select pp.id_proyek, ${aggregate}(pp.jumlah*if(pp.id_produkkeluar,ifnull(pm.harga,0),pp.harga)) totalpengeluaran from pengeluaranproyek pp
left join produkkeluar pk on pk.id=pp.id_produkkeluar
left join produkmasuk pm on pm.id=pk.id_produkmasuk
group by pp.id_proyek
where 1=1 ${queryWhereBuilder(id, "pp.id_proyek")} ${queryWhereBuilder(lunas, "lunas")}`;
const buildCalculatePembayaranProyekById = ({ id = null, aggregate }) =>
  `select id_proyek, ${aggregate}(nominal) totalpembayaran from pembayaranproyek
group by id_proyek
where 1=1 ${queryWhereBuilder(id, "id_proyek")}`;

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
  async calculatePengeluaranById({ id, aggregate, lunas }) {
    const query = buildCalculatePengeluaranById({ id, aggregate, lunas });
    const values = [
      ...conditionalArrayBuilder(id),
      ...conditionalArrayBuilder(lunas),
    ];
    const [rows] = await db.execute(query, values);
    return rows[0];
  },
  async calculatePembayaranById({ id, aggregate }) {
    const query = buildCalculatePembayaranProyekById({ id, aggregate });
    const values = [id];
    const [rows] = await db.execute(query, values);
    return rows[0];
  },
  async getMonthlyReport({ from, to }) {
    const aggregate = "sum";
    const sql = `select p.*, pm.totalpembayaran, pn.totalpengeluaran, pm.totalpembayaran - pn.pengeluaran profit, pp.nominal, pp.tanggal, mp.nama metodepembayaran, b.nama bank from ${mainTable} p
    left join (${buildCalculatePengeluaranById({ aggregate })}) pn on pn.id_proyek=p.id
    left join (${buildCalculatePembayaranProyekById({ aggregate })}) pm on pm.id_proyek=p.id
    left join pembayaranproyek pp on pp.id_proyek=p.id
    left join metodepembayaran mp on mp.id=pp.id_metodepembayaran
    left join bank b on b.id=pp.id_bank
    where p.tanggal >= ?
    AND p.tanggal < ?
    `;
    const values = [from, to];
    const [rows] = db.execute(sql, values);
    return rows;
  },
  buildLeftJoin,
  select,
};
export default ProyekModel;
