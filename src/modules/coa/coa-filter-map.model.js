import {
  generateStandardCRUDModel,
  generateDefaultCRUDModel,
  defaultFields,
} from "../default/default.model.js";

const TABLE_NAME = "coa_filter_map";
const extraAllowedFields = [
  ...defaultFields,
  "id_coa_filter",
  "id_coa",
  "id_coa_type",
  "id_coa_subtype",
];
const Model = generateDefaultCRUDModel(
  TABLE_NAME,
  extraAllowedFields,
  extraAllowedFields,
  {
    filterAliases: {
      id_coa_type: "ct.id",
      id_coa_subtype: "cs.id",
      id_coa: "c.id",
      id_coa_filter: "cf.id",
    },
    customSelect:
      "cf.nama coa_filter, c.nama coa, ct.nama coa_type, cs.nama coa_subtype",
    generateCustomJoin: (mainTable) => `
    left join coa_filter cf on cf.id=${mainTable}.id_coa_filter
    left join coa c on c.id=${mainTable}.id_coa
    left join coa_type ct on ct.id=${mainTable}.id_coa_type
    left join coa_subtype cs on cs.id=${mainTable}.id_coa_subtype
  `,
    prepareData: (data) => {
      const { id_coa_type, id_coa_subtype, id_coa, ...rest } = data;
      // Prioritize based on your existing logic order
      if (id_coa)
        return { ...rest, id_coa, id_coa_subtype: null, id_coa_type: null };
      if (id_coa_subtype)
        return { ...rest, id_coa_subtype, id_coa: null, id_coa_type: null };
      if (id_coa_type)
        return { ...rest, id_coa_type, id_coa_subtype: null, id_coa: null };
      return data;
    },
  },
);

export default Model;
