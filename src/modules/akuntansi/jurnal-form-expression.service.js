import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./jurnal-form-expression.model.js";
import { withTransaction } from "../../helpers/transaction.js";
import { assertNotSystemGenerated } from "./system-seed-guard.js";

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {
    async patch(id, data) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          `SELECT jfe.keterangan, jf.system_key, jf.nama
           FROM jurnal_form_expression jfe
           JOIN jurnal_form jf ON jf.id = jfe.id_jurnal_form
           WHERE jfe.id = ? LIMIT 1 FOR UPDATE`,
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemGenerated(current, "Jurnal Form Expression");
        return Model.patch(id, data, conn);
      });
    },
    async destroy(id) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          `SELECT jfe.keterangan, jf.system_key, jf.nama
           FROM jurnal_form_expression jfe
           JOIN jurnal_form jf ON jf.id = jfe.id_jurnal_form
           WHERE jfe.id = ? LIMIT 1 FOR UPDATE`,
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemGenerated(current, "Jurnal Form Expression");
        return Model.destroy(id, conn);
      });
    },
  },
});

export default Service;
