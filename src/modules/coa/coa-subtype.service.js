import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./coa-subtype.model.js";
import { withTransaction } from "../../helpers/transaction.js";
import { resolveCoaSubtype, resolveCoaType } from "./coa-resolver.js";

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {
    async create(data) {
      return withTransaction(async (conn) => {
        const id_coa_type = await resolveCoaType(data, conn);
        const id_coa_subtype = await resolveCoaSubtype(data, id_coa_type, conn);
        return id_coa_subtype
          ? { insertId: id_coa_subtype, affectedRows: 1 }
          : Model.create({ ...data, id_coa_type }, conn);
      });
    },
    async patch(id, data) {
      return withTransaction(async (conn) => {
        const [currentRows] = await conn.execute(
          `SELECT cs.id_coa_type, cs.nama, ct.nama coa_type
					 FROM coa_subtype cs
					 LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
					 WHERE cs.id = ? LIMIT 1`,
          [id],
        );
        const current = currentRows[0];
        if (!current) throw new Error("Data not found");

        const resolvedData = { ...current, ...data };
        const id_coa_type = await resolveCoaType(resolvedData, conn);
        return Model.patch(id, { ...data, id_coa_type }, conn);
      });
    },
  },
});

export default Service;
