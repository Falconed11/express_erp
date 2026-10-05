import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./jurnal-form.model.js";
import { withTransaction } from "../../helpers/transaction.js";
import { assertNotSystemGenerated } from "./system-seed-guard.js";

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {
    async patch(id, data) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          "SELECT nama, system_key, keterangan FROM jurnal_form WHERE id = ? LIMIT 1 FOR UPDATE",
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemGenerated(current, "Jurnal Form");
        return Model.patch(id, data, conn);
      });
    },
    async destroy(id) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          "SELECT nama, system_key, keterangan FROM jurnal_form WHERE id = ? LIMIT 1 FOR UPDATE",
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemGenerated(current, "Jurnal Form");
        return Model.destroy(id, conn);
      });
    },
  },
});

export default Service;
