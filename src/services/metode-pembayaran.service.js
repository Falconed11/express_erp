import MetodePembayaran from "../models/metode-pembayaran.model.js";
import { patchService } from "./default.service.js";
const MetodePembayaranService = {
  async patch(id, data) {
    return MetodePembayaran.patch(id, data);
  },
};
export default MetodePembayaranService;
