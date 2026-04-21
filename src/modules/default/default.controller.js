import { defaultAsyncController } from "../../helpers/default.js";

/**
 * Generates a default controller object for controller operations.
 * @param {import('#/types/model.types.js').CRUDModel} options
 */
export const generateDefaultCRUDController = ({
  create,
  getAll,
  getById,
  patch,
  destroy,
  disableNama = false,
  customController = {},
}) => ({
  async create(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { body } = req;
        if (!disableNama && !body.nama)
          throw new Error("Nama tidak boleh kosong!");
        return create(body);
      },
      {
        req,
        res,
        next,
      },
    );
  },
  async getAll(req, res, next) {
    defaultAsyncController(
      async (req) => {
        return getAll(req.query);
      },
      {
        req,
        res,
        next,
      },
    );
  },
  async getById(req, res, next) {
    defaultAsyncController(
      async (req) => {
        const { id } = req.params;
        if (!id) throw new Error("Id tidak boleh kosong!");
        return getById(id);
      },
      {
        req,
        res,
        next,
      },
    );
  },
  async patch(req, res, next) {
    defaultAsyncController(
      async (req) => {
        // console.log(req.body);
        const { id } = req.params;
        if (!id) throw new Error("Id tidak boleh kosong!");
        return patch(id, req.body);
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
      async (req) => {
        const { id } = req.params;
        if (!id) throw new Error("Id tidak boleh kosong!");
        return destroy(id);
      },
      {
        req,
        res,
        next,
      },
    );
  },
  ...customController,
});
