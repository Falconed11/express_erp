import { generateDefaultCRUDService } from "../default/default.service.js";
import db from "../../config/knex.js";
import Model from "./jenis-aktivitas-sales.model.js";

const TABLE_NAME = "jenis_aktivitas_sales";

const Service = {
  ...generateDefaultCRUDService(Model),
  async transfer(id, targetId, updatedBy = null) {
    if (!id || !targetId) throw new Error("Jenis aktivitas sumber dan tujuan wajib diisi.");
    if (String(id) === String(targetId)) {
      throw new Error("Jenis aktivitas tujuan harus berbeda.");
    }

    return db.transaction(async (trx) => {
      const source = await trx(TABLE_NAME).where({ id }).first("id");
      if (!source) throw new Error("Jenis aktivitas sumber tidak ditemukan.");
      const target = await trx(TABLE_NAME)
        .where({ id: targetId, aktif: true })
        .first("id");
      if (!target)
        throw new Error("Jenis aktivitas tujuan tidak ditemukan atau tidak aktif.");

      const updates = { id_jenis_aktivitas: targetId };
      if (updatedBy) updates.updated_by = updatedBy;
      const transferred = await trx("aktivitassales")
        .where({ id_jenis_aktivitas: id })
        .update(updates);
      return { source_id: Number(id), target_id: Number(targetId), transferred };
    });
  },
};

export default Service;
