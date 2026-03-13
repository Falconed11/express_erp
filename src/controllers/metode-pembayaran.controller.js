import { defaultAsyncController } from "../helpers/default.js";
import MetodePembayaranService from "../services/metode-pembayaran.service.js";

const MetodePembayaranController = {
  async patch(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { id } = req.params;
        if (!id) {
          throw new Error("ID is required");
        }
        return MetodePembayaranService.patch(req.params.id, req.body);
      },
      {
        req,
        res,
        next,
      },
    );
  },
};
export default MetodePembayaranController;
