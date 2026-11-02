import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./coa.model.js";
import LaporanModel from "../akuntansi/laporan.model.js";
import db from "../../config/db.js";
import { withTransaction } from "../../helpers/transaction.js";
import { resolveCoaSubtype, resolveCoaType } from "./coa-resolver.js";
import { assertNotSystemSeededCoa } from "./system-seed-guard.js";

const Service = generateDefaultCRUDService({
  ...Model,
  getAll: async (data) => {
    const {
      id_laporan,
      id_perusahaan,
      exact_id_perusahaan,
      visible_peran,
      unconnected,
      include_id,
      ...rest
    } = data;
    const rows = !id_laporan
      ? await Model.getAll({
          ...rest,
          ...(unconnected ? { unconnected, include_id } : {}),
          ...(id_perusahaan
            ? {
                id_perusahaan: exact_id_perusahaan
                  ? [id_perusahaan]
                  : [id_perusahaan, null],
              }
            : {}),
        })
      : await (async () => {
          const rawCoas = await LaporanModel.getCoasWithoutValue(id_laporan, {
            id_perusahaan,
          });
          const coaIds = (rawCoas || [])
            .map((coa) => coa?.id_coa)
            .filter(Boolean);
          return Model.getAll({
            ...rest,
            ...(coaIds.length ? { id: coaIds } : {}),
          });
        })();

    if (!visible_peran || ["owner", "super"].includes(visible_peran))
      return rows;

    const [hiddenRows] = await db.execute(
      "SELECT id_coa FROM coa_role_visibility WHERE peran = ? AND aktif = 1",
      [visible_peran],
    );
    const hiddenIds = new Set(hiddenRows.map((row) => Number(row.id_coa)));
    return rows.filter((row) => !hiddenIds.has(Number(row.id)));
  },
  customService: {
    async getBalances(idPerusahaan) {
      const companyId = Number(idPerusahaan);
      if (!Number.isSafeInteger(companyId) || companyId <= 0) {
        throw new Error("Id perusahaan tidak valid");
      }

      const [rows] = await db.execute(
        `SELECT
           c.id,
           c.nama,
           cs.nama AS coa_subtype,
           COALESCE(
             SUM(
               CASE
                 WHEN t.tipe = ct.normal_balance THEN t.amount
                 ELSE -t.amount
               END
             ),
             0
           ) AS saldo
         FROM coa c
         INNER JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
         INNER JOIN coa_type ct ON ct.id = cs.id_coa_type
         LEFT JOIN (
           SELECT t.id_coa, t.tipe, t.amount
           FROM transaksi t
           INNER JOIN jurnal j ON j.id = t.id_jurnal
           WHERE j.id_perusahaan = ?
         ) t ON t.id_coa = c.id
         WHERE c.aktif = 1
           AND cs.nama IN ('Kas', 'Bank')
           AND (c.id_perusahaan IS NULL OR c.id_perusahaan = ?)
         GROUP BY c.id, c.nama, cs.nama, ct.normal_balance
         ORDER BY CASE cs.nama WHEN 'Kas' THEN 0 ELSE 1 END, c.nama`,
        [companyId, companyId],
      );

      return rows;
    },
    async create(data) {
      return withTransaction(async (conn) => {
        const id_coa_type = await resolveCoaType(data, conn);
        const id_coa_subtype = await resolveCoaSubtype(data, id_coa_type, conn);
        return Model.create(
          {
            ...data,
            id_coa_type,
            ...(id_coa_subtype ? { id_coa_subtype } : {}),
          },
          conn,
        );
      });
    },
    async patch(id, data) {
      return withTransaction(async (conn) => {
        const [currentRows] = await conn.execute(
          `SELECT c.nama, c.id_coa_subtype, cs.id_coa_type,
                  cs.nama coa_subtype,
                  ct.nama coa_type
           FROM coa c
           LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
           LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
           WHERE c.id = ? LIMIT 1 FOR UPDATE`,
          [id],
        );
        const current = currentRows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemSeededCoa("coa", current);

        const resolvedData = { ...current, ...data };
        const id_coa_type = await resolveCoaType(resolvedData, conn);
        const id_coa_subtype = await resolveCoaSubtype(
          resolvedData,
          id_coa_type,
          conn,
        );
        return Model.patch(
          id,
          {
            ...data,
            id_coa_subtype,
          },
          conn,
        );
      });
    },
    async destroy(id) {
      return withTransaction(async (conn) => {
        const [currentRows] = await conn.execute(
          `SELECT c.nama, cs.nama coa_subtype, ct.nama coa_type
           FROM coa c
           LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
           LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
           WHERE c.id = ? LIMIT 1 FOR UPDATE`,
          [id],
        );
        const current = currentRows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemSeededCoa("coa", current);
        return Model.destroy(id, conn);
      });
    },
  },
});

export default Service;
