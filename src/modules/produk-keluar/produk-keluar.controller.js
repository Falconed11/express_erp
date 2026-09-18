import { defaultAsyncController } from "../../helpers/default.js";
import Service from "./produk-keluar.service.js";

const Controller = {
  async create(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { body, user } = req;
        const { productExpenses } = body;
        if (!Array.isArray(productExpenses))
          throw new Error("Pengeluaran produk harus berupa array!");
        if (productExpenses.length === 0)
          throw new Error("Pengeluaran produk tidak boleh kosong!");
        if (!user?.id_karyawan)
          throw new Error("Identitas karyawan pada token tidak ditemukan.");

        return Service.create({
          productExpenses,
          created_by: user.id_karyawan,
        });
      },
      {
        req,
        res,
        next,
      },
    );
  },

  async destroy(req, res, next) {
    defaultAsyncController(
      () => Service.destroy(req.params.id),
      { req, res, next },
    );
  },
};

export default Controller;
