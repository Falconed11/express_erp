import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./coa.model.js";
import LaporanModel from "../akuntansi/laporan.model.js";
import db from "../../config/db.js";
import { withTransaction } from "../../helpers/transaction.js";
import { resolveCoaSubtype, resolveCoaType } from "./coa-resolver.js";

const Service = generateDefaultCRUDService({
  ...Model,
  getAll: async (data) => {
    const {
      id_laporan,
      id_perusahaan,
      exact_id_perusahaan,
      visible_peran,
      ...rest
    } = data;
    const rows = !id_laporan
      ? await Model.getAll({
          ...rest,
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
          `SELECT c.id_coa_subtype, cs.id_coa_type, cs.nama coa_subtype,
                  ct.nama coa_type
           FROM coa c
           LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
           LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
           WHERE c.id = ? LIMIT 1`,
          [id],
        );
        const current = currentRows[0];
        if (!current) throw new Error("Data not found");

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
  },
});

export default Service;
