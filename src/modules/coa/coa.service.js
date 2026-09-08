import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./coa.model.js";
import LaporanModel from "../akuntansi/laporan.model.js";
import db from "../../config/db.js";

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
});

export default Service;
