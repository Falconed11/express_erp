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
    // Parse query parameters: if a value is a JSON string, parse it
    function parseQueryValue(val) {
      if (typeof val !== "string") return val;
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === "object" && parsed !== null) {
          return parsed;
        }
      } catch (e) {}
      return val;
    }
    const parsedQuery = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        parsedQuery[key] = value.map(parseQueryValue);
      } else {
        parsedQuery[key] = parseQueryValue(value);
      }
    }
    defaultAsyncController(
      async (req) => {
        return getAll(parsedQuery);
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
