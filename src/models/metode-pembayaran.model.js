import db from "../config/db.js";
import { patch } from "./default.model.js";

const MetodePembayaran = {
  table: "metodepembayaran",
  allowedFields: [
    "id_bank",
    "id_perusahaan",
    "norekening",
    "atasnama",
    "nama",
    "hide",
    "keterangan",
    "last_user",
  ],
  async patch(id, data) {
    return patch(id, this.table, this.allowedFields, data);
  },
};
export default MetodePembayaran;
