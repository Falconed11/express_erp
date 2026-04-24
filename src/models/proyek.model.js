import db from "../config/db.js";
import { conditionalArrayBuilder, queryWhereBuilder } from "../utils/tools.js";
import { patch } from "./default.model.js";
import { withTransaction } from "../helpers/transaction.js";

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
where 1=1 ${queryWhereBuilder(id, "pp.id_proyek")} ${queryWhereBuilder(lunas, "lunas")}
group by pp.id_proyek
`;
const buildCalculatePembayaranProyekById = ({ id = null, aggregate }) =>
  `select id_proyek, ${aggregate}(nominal) totalpembayaran from pembayaranproyek
where 1=1 ${queryWhereBuilder(id, "id_proyek")}
group by id_proyek
`;
const ProyekModel = {
  table: "proyek",
  allowedFields: [
    "hide",
    "id_instansi",
    "id_perusahaan",
    "nama",
    "klien",
    "id_karyawan",
    "id_jenisproyek",
    "tanggal_penawaran",
    "tanggalsuratjalan",
    "alamatsuratjalan",
    "id_po",
    "keterangan",
    "versi",
  ],
  async findAll() {
    const [rows] = await db.execute(`SELECT * FROM ${this.table}`);
    return rows;
  },
  async getById(id) {
    const sql = `SELECT * FROM ${this.table} WHERE id = ?`;
    const [rows] = await db.execute(sql, [id]);
    return rows[0];
  },
  async create(data) {
    const fieldNames = Object.keys(data).filter((key) => key !== "id");
    if (fieldNames.length === 0) {
      throw new Error("No data to insert");
    }
    const placeholders = fieldNames.map(() => "?").join(", ");
    const values = fieldNames.map((key) => data[key]);
    const sql = `INSERT INTO ${this.table} (${fieldNames.join(", ")}) VALUES (${placeholders})`;
    const [result] = await db.execute(sql, values);
    return result;
  },
  async getTableInsertColumns(tableName, conn) {
    const [columns] = await conn.execute(`SHOW COLUMNS FROM ${tableName}`);
    return columns
      .map((column) => column.Field)
      .filter((field) => field !== "id");
  },
  async cloneTableRows(conn, tableName, oldProjectId, newProjectId) {
    const insertColumns = await this.getTableInsertColumns(tableName, conn);
    if (!insertColumns.includes("id_proyek")) return;

    const selectColumns = insertColumns
      .map((column) => (column === "id_proyek" ? "?" : column))
      .join(", ");
    const sql = `INSERT INTO ${tableName} (${insertColumns.join(", ")}) SELECT ${selectColumns} FROM ${tableName} WHERE id_proyek = ?`;
    await conn.execute(sql, [newProjectId, oldProjectId]);
  },
  async duplicate(id, overrides = {}) {
    const record = await this.getById(id);
    if (!record) {
      throw new Error(`Proyek with id ${id} not found`);
    }
    const projectData = {
      ...record,
      ...overrides,
      nama:
        overrides.hasOwnProperty("nama") && overrides.nama !== undefined
          ? overrides.nama
          : `${record.nama} - copy`,
      id_statusproyek: 1,
      tanggal_penawaran: new Date(),
    };
    delete projectData.id;

    return withTransaction(async (conn) => {
      const excludedFields = [
        "id",
        "id_second",
        "id_kustom",
        "tanggal",
        "tanggal_reject",
      ];
      const fieldNames = Object.keys(projectData).filter(
        (key) => !excludedFields.includes(key),
      );
      const placeholders = fieldNames.map(() => "?").join(", ");
      const values = fieldNames.map((key) => projectData[key]);
      const insertSql = `INSERT INTO ${this.table} (${fieldNames.join(", ")}) VALUES (${placeholders})`;
      const [result] = await conn.execute(insertSql, values);
      const newProjectId = result.insertId;

      await this.cloneTableRows(conn, "keranjangproyek", id, newProjectId);
      await this.cloneTableRows(
        conn,
        "proyek_keteranganpenawaran",
        id,
        newProjectId,
      );
      await this.cloneTableRows(conn, "rekapitulasiproyek", id, newProjectId);

      return { insertId: newProjectId };
    });
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
  async getMonthlyReports({
    from,
    to,
    jenisproyek,
    jenisinstansi,
    golonganinstansi,
    perusahaan,
  }) {
    const aggregate = "sum";
    const sql = `select p.*, jp.nama jenisproyek, pr.nama perusahaan, k.nama karyawan, i.nama instansi, i.swasta, ji.nama jenisinstansi, gi.nama golonganinstansi, pm.totalpembayaran, pn.totalpengeluaran, pm.totalpembayaran - pn.totalpengeluaran profit, pp.nominal, pp.tanggal tanggal_pembayaran, mp.nama metodepembayaran, b.nama bank from ${this.table} p
    left join jenisproyek jp on jp.id=p.id_jenisproyek
    left join perusahaan pr on pr.id=p.id_perusahaan
    left join karyawan k on k.id=p.id_karyawan
    left join instansi i on i.id=p.id_instansi
    left join jenisinstansi ji on ji.id=i.id_jenisinstansi
    left join golonganinstansi gi on gi.id=i.id_golonganinstansi
    left join (${buildCalculatePengeluaranById({ aggregate })}) pn on pn.id_proyek=p.id
    left join (${buildCalculatePembayaranProyekById({ aggregate })}) pm on pm.id_proyek=p.id
    left join pembayaranproyek pp on pp.id_proyek=p.id
    left join metodepembayaran mp on mp.id=pp.id_metodepembayaran
    left join bank b on b.id=mp.id_bank
    left join statusproyek sp on sp.id=p.id_statusproyek
    where p.tanggal >= ?
    AND p.tanggal < ?
    and sp.progress=100
    ${queryWhereBuilder(jenisproyek, "p.id_jenisproyek")}
    ${queryWhereBuilder(jenisinstansi, "i.id_jenisinstansi")}
    ${queryWhereBuilder(golonganinstansi, "i.id_golonganinstansi")}
    ${queryWhereBuilder(perusahaan, "p.id_perusahaan")}
    `;
    const values = [
      from,
      to,
      ...conditionalArrayBuilder(jenisproyek),
      ...conditionalArrayBuilder(jenisinstansi),
      ...conditionalArrayBuilder(golonganinstansi),
      ...conditionalArrayBuilder(perusahaan),
    ];
    const [rows] = await db.execute(sql, values);
    return rows;
  },
  async patch(id, data) {
    return patch(id, this.table, this.allowedFields, data);
  },
  buildLeftJoin,
  select,
};
export default ProyekModel;
