import { getAll } from "../models/default.model.js";

const table = "perusahaan";

const PerusahaanService = {
  async get() {
    return getAll(table);
  },
};
export default PerusahaanService;
