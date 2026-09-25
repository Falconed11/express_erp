import db from "../../config/db.js";
import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "transaksi";
const extraAllowedFields = ["id_jurnal", "id_coa", "tipe", "amount"];
const Model = generateStandardCRUDModel({
  allowNoUpdate: true,
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  generateAllowedSortFields: (mainTable) => ({
    id: `${mainTable}.id`,
    tanggal: "j.tanggal",
    keterangan_jurnal: "j.keterangan",
    coa_subtype: "cs.id",
    coa_type: "ct.id",
  }),
  filterAliases: {
    id_jurnal: "j.id",
    id_coa: "c.id",
    id_perusahaan: "p.id",
    id_proyek: "pr.id",
    id_instansi: "i.id",
    jurnal: "j.keterangan",
    id_coa_subtype: "cs.id",
    id_coa_type: "ct.id",
    id_jurnal_form: "jf.id",
  },
  customSelect: [
    "j.tanggal",
    "j.keterangan keterangan_jurnal",
    "c.nama coa",
    "cs.nama coa_subtype",
    "ct.nama coa_type",
    "p.nama perusahaan",
    "pr.id id_proyek",
    "pr.nama proyek",
    "i.nama instansi",
    "jf.nama jurnal_form",
  ],
  generateCustomJoin: (
    mainTable,
  ) => `left join jurnal j on j.id=${mainTable}.id_jurnal
    left join coa c on c.id=${mainTable}.id_coa
    left join coa_subtype cs on c.id_coa_subtype=cs.id
    left join coa_type ct on cs.id_coa_type=ct.id
    left join perusahaan p on p.id=j.id_perusahaan
    left join proyek pr on pr.id=j.id_proyek
    left join instansi i on i.id=pr.id_instansi
    left join jurnal_form jf on jf.id=j.id_jurnal_form`,
  generateOrderBy: (mainTable) =>
    `ORDER BY j.tanggal DESC, ${mainTable}.id DESC`,
  generateCustomFilter: ({ id_coa_debit, id_coa_kredit, excludeCoaIds }) => {
    const sqlParts = [];
    const values = [];

    if (id_coa_debit) {
      sqlParts.push(`AND EXISTS (
        SELECT 1 FROM transaksi debit_filter
        WHERE debit_filter.id_jurnal = main.id_jurnal
          AND debit_filter.tipe = 1
          AND debit_filter.id_coa = ?
      )`);
      values.push(id_coa_debit);
    }
    if (id_coa_kredit) {
      sqlParts.push(`AND EXISTS (
        SELECT 1 FROM transaksi kredit_filter
        WHERE kredit_filter.id_jurnal = main.id_jurnal
          AND kredit_filter.tipe = 0
          AND kredit_filter.id_coa = ?
      )`);
      values.push(id_coa_kredit);
    }

    return { sql: sqlParts.join(" "), values };
  },
  customGetAll: async (
    {
      limit,
      offset,
      from,
      to,
      id_jurnal_form,
      id_perusahaan,
      id_coa_debit,
      id_coa_kredit,
      id_jurnal,
      excludeCoaIds,
    } = {},
    conn = db,
  ) => {
    const where = [];
    const values = [];

    if (id_jurnal_form) {
      where.push("j.id_jurnal_form = ?");
      values.push(id_jurnal_form);
    }
    if (id_perusahaan) {
      where.push("j.id_perusahaan = ?");
      values.push(id_perusahaan);
    }
    if (from) {
      where.push("j.tanggal >= ?");
      values.push(from);
    }
    if (to) {
      where.push("j.tanggal <= ?");
      values.push(to);
    }
    if (id_jurnal) {
      where.push("j.id = ?");
      values.push(id_jurnal);
    }

    if (id_coa_debit) {
      where.push(`EXISTS (
      SELECT 1 FROM transaksi d 
      WHERE d.id_jurnal = j.id AND d.tipe = 1 AND d.id_coa = ?
    )`);
      values.push(id_coa_debit);
    }

    if (id_coa_kredit) {
      where.push(`EXISTS (
      SELECT 1 FROM transaksi k 
      WHERE k.id_jurnal = j.id AND k.tipe = 0 AND k.id_coa = ?
    )`);
      values.push(id_coa_kredit);
    }

    if (Array.isArray(excludeCoaIds) && excludeCoaIds.length) {
      const placeholders = excludeCoaIds.map(() => "?").join(",");
      where.push(`NOT EXISTS (
      SELECT 1 FROM transaksi e 
      WHERE e.id_jurnal = j.id AND e.id_coa IN (${placeholders})
    )`);
      values.push(...excludeCoaIds);
    }

    const whereClause = where.length ? where.join(" AND ") : "1=1";

    // 1. Get total row count (lightweight query before joins/grouping)
    const countSql = `
    SELECT COUNT(DISTINCT j.id) AS totalRows 
    FROM jurnal j 
    WHERE ${whereClause}
  `;
    const [[{ totalRows }]] = await conn.execute(countSql, values);

    // If there are no records matching, return early to save execution time
    if (totalRows === 0) {
      return { totalRows: 0, data: [] };
    }

    // 2. Main data query
    let dataSql = `
    SELECT
      j.id AS id_jurnal,
      j.tanggal,
      j.keterangan AS keterangan_jurnal,
      MAX(CASE WHEN t.tipe = 1 THEN t.id END) AS id,
      MAX(CASE WHEN t.tipe = 1 THEN c.nama END) AS tipe,
      MAX(CASE WHEN t.tipe = 0 THEN c.nama END) AS kas,
      SUM(CASE WHEN t.tipe = 1 THEN t.amount ELSE 0 END) AS nominal,
      SUM(CASE WHEN t.tipe = 1 THEN t.amount ELSE 0 END) AS biaya,
      pk.id_produkkeluar,
      pk.id_produk,
      pk.jumlah_produk,
      ppk.nama AS produk,
      ppk.stok,
      pr.nama AS proyek
    FROM jurnal j
    INNER JOIN transaksi t ON t.id_jurnal = j.id
    LEFT JOIN coa c ON c.id = t.id_coa
    LEFT JOIN (
      SELECT id_jurnal, MAX(id) AS id_produkkeluar, MAX(id_produk) AS id_produk, SUM(jumlah) AS jumlah_produk
      FROM produkkeluar
      GROUP BY id_jurnal
    ) pk ON pk.id_jurnal = j.id
    LEFT JOIN produk ppk ON ppk.id = pk.id_produk
    LEFT JOIN proyek pr ON pr.id = j.id_proyek
    WHERE ${whereClause}
    GROUP BY j.id, pk.id_produkkeluar
    ORDER BY j.tanggal DESC, j.id DESC
  `;

    const dataValues = [...values];

    if (limit != null && offset != null) {
      dataSql += " LIMIT ? OFFSET ?";
      dataValues.push(Number(limit), Number(offset));
    }

    const [data] = await conn.execute(dataSql, dataValues);

    return {
      totalRows: Number(totalRows),
      data,
    };
  },
});

export default Model;
