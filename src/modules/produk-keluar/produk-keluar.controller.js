import { defaultAsyncController } from "../../helpers/default.js";
import Service from "./produk-keluar.service.js";

const Controller = {
  async create(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { body, user } = req;
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new Error("Data pengeluaran produk tidak valid.");
        if (!body.projectId) throw new Error("projectId wajib diisi.");
        if (!body.productId) throw new Error("productId wajib diisi.");
        if (
          typeof body.date !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
          Number.isNaN(Date.parse(`${body.date}T00:00:00Z`))
        )
          throw new Error("date wajib menggunakan format YYYY-MM-DD.");
        if (typeof body.desc !== "string")
          throw new Error("desc wajib berupa teks.");
        if (!Array.isArray(body.stockOut) || body.stockOut.length === 0)
          throw new Error(
            "stockOut wajib berupa array dan tidak boleh kosong.",
          );
        if (
          body.stockOut.some(
            (stock) =>
              !stock ||
              typeof stock !== "object" ||
              Array.isArray(stock) ||
              stock.stockInId == null ||
              stock.quantity == null,
          )
        )
          throw new Error(
            "Setiap stockOut wajib memiliki stockInId dan quantity.",
          );
        if (!user?.id_karyawan)
          throw new Error("Identitas karyawan pada token tidak ditemukan.");

        return Service.create({
          input: body,
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
    defaultAsyncController(() => Service.destroy(req.params.id), {
      req,
      res,
      next,
    });
  },
};

export default Controller;
