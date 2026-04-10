import { generateStandardCRUDModel } from "../default/default.model.js";

const TABLE_NAME = "peristiwa_coa_map";
const extraAllowedFields = ["id_peristiwa", "entry_tipe", "amount_source"];
const Model = generateStandardCRUDModel({
  tableName: TABLE_NAME,
  extraAllowedFieldsForCreate: extraAllowedFields,
  extraAllowedFieldsForUpdate: extraAllowedFields,
  customSelect: "p.nama peristiwa",
  generateCustomJoin: (mainTable) => `
            left join peristiwa p on p.id=${mainTable}.id_peristiwa
        `,
});

export default Model;
