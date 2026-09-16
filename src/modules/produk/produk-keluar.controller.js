import { defaultAsyncController } from "../../helpers/default.js";
import Service from "./produk-keluar.service.js";

const Controller = {
  async create(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { body } = req;
        if (!body.productExpenses)
          throw new Error("Pengeluaran produk tidak boleh kosong!");
        if (!Array.isArray(body.productExpenses))
          throw new Error("Pengeluaran produk harus berupa array!");
        return Service.create(body);
      },
      {
        req,
        res,
        next,
      },
    );
  },
};

export default Controller;
