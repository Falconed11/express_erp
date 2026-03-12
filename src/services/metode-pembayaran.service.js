import MetodePembayaran from "../models/metode-pembayaran.model";
const MetodePembayaranService = {
  async patch(id, data) {
    if (!id) {
      throw new Error("ID is required");
    }
    const result = await MetodePembayaran.patch(id, data);
    if (result.affectedRows === 0) {
      throw new Error("No data updated");
    }
    return result;
  },
};
export default MetodePembayaranService;
