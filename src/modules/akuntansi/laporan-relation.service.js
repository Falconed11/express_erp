import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./laporan-relation.model.js";
import { withTransaction } from "../../helpers/transaction.js";
import { assertNotSystemGenerated } from "./system-seed-guard.js";

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {
    async patch(id, data) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          "SELECT nama, keterangan FROM laporan_relation WHERE id = ? LIMIT 1 FOR UPDATE",
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemGenerated(current, "Struktur Laporan");
        return Model.patch(id, data, conn);
      });
    },
    async destroy(id) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          "SELECT nama, keterangan FROM laporan_relation WHERE id = ? LIMIT 1 FOR UPDATE",
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemGenerated(current, "Struktur Laporan");
        return Model.destroy(id, conn);
      });
    },
  },
});

export default Service;
