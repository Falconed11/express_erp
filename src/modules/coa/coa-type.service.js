import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./coa-type.model.js";
import { withTransaction } from "../../helpers/transaction.js";
import { assertNotSystemSeededCoa } from "./system-seed-guard.js";

const validateNormalBalance = (data = {}) => {
  if (
    data.normal_balance != null &&
    ![0, 1, "0", "1"].includes(data.normal_balance)
  ) {
    throw new Error("normal_balance harus bernilai 0 atau 1");
  }
};

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {
    async create(data) {
      validateNormalBalance(data);
      return Model.create(data);
    },
    async patch(id, data) {
      validateNormalBalance(data);
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          "SELECT nama FROM coa_type WHERE id = ? LIMIT 1 FOR UPDATE",
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemSeededCoa("coa_type", current);
        return Model.patch(id, data, conn);
      });
    },
    async destroy(id) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.execute(
          "SELECT nama FROM coa_type WHERE id = ? LIMIT 1 FOR UPDATE",
          [id],
        );
        const current = rows[0];
        if (!current) throw new Error("Data not found");
        assertNotSystemSeededCoa("coa_type", current);
        return Model.destroy(id, conn);
      });
    },
  },
});

export default Service;
