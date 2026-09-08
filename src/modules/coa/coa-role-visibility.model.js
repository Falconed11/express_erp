import { generateDefaultCRUDModel } from "../default/default.model.js";

const Model = generateDefaultCRUDModel(
  "coa_role_visibility",
  ["id_coa", "peran", "aktif", "created_by", "updated_by"],
  ["id_coa", "peran", "aktif", "updated_by"],
  {
    validFilterColumns: ["id", "id_coa", "peran", "aktif"],
    customSelect: "c.nama coa",
    generateCustomJoin: (mainTable) =>
      `left join coa c on c.id=${mainTable}.id_coa`,
  },
);

export default Model;
