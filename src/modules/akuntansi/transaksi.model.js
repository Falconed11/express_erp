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
  generateCustomFilter: ({ id_coa_debit, id_coa_kredit }) => {
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
    if (id_coa_debit) {
      where.push(`EXISTS (
          SELECT 1 FROM transaksi debit_filter
          WHERE debit_filter.id_jurnal = j.id
            AND debit_filter.tipe = 1
            AND debit_filter.id_coa = ?
        )`);
      values.push(id_coa_debit);
    }
    if (id_coa_kredit) {
      where.push(`EXISTS (
          SELECT 1 FROM transaksi kredit_filter
          WHERE kredit_filter.id_jurnal = j.id
            AND kredit_filter.tipe = 0
            AND kredit_filter.id_coa = ?
        )`);
      values.push(id_coa_kredit);
    }

    const hasPagination = limit != null && offset != null;
    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);
    const paginationSql = hasPagination ? "LIMIT ? OFFSET ?" : "";
    const sql = `SELECT
          j.id id_jurnal,
          j.tanggal,
          j.keterangan keterangan_jurnal,
          MAX(CASE WHEN t.tipe = 1 THEN t.id END) id,
          MAX(CASE WHEN t.tipe = 1 THEN c.nama END) tipe,
          MAX(CASE WHEN t.tipe = 0 THEN c.nama END) kas,
          SUM(CASE WHEN t.tipe = 1 THEN t.amount ELSE 0 END) nominal,
          SUM(CASE WHEN t.tipe = 1 THEN t.amount ELSE 0 END) biaya,
          pr.nama proyek,
          COUNT(*) OVER () total
        FROM jurnal j
        INNER JOIN transaksi t ON t.id_jurnal = j.id
        LEFT JOIN coa c ON c.id = t.id_coa
        LEFT JOIN proyek pr ON pr.id = j.id_proyek
        WHERE ${where.length ? where.join(" AND ") : "1=1"}
        GROUP BY j.id, j.tanggal, j.keterangan, pr.nama
        ORDER BY j.tanggal DESC, j.id DESC
        ${paginationSql}`;

    if (hasPagination) values.push(parsedLimit, parsedOffset);
    const [rows] = await conn.execute(sql, values);
    return rows;
  },
});

export default Model;
