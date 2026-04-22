import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./coa-type.model.js";

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
      return Model.patch(id, data);
    },
  },
});

export default Service;
