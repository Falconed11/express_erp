import { defaultAsyncController } from "../../helpers/default.js";
import { generateDefaultCRUDController } from "../default/default.controller.js";
import Service from "./laporan.service.js";

const Controller = generateDefaultCRUDController({
  ...Service,
  customController: {
    async getById(req, res, next) {
      defaultAsyncController(
        async (req) => {
          const { id } = req.params;
          const { query: data } = req;
          if (!id) throw new Error("Id tidak boleh kosong!");
          return Service.getById(id, data);
        },
        {
          req,
          res,
          next,
        },
      );
    },

    async getCoasWithoutValue(req, res, next) {
      defaultAsyncController(
        async (req) => {
          const { id } = req.params;
          const { query: data } = req;
          if (!id) throw new Error("Id tidak boleh kosong!");
          return Service.getCoasWithoutValue(id, data);
        },
        {
          req,
          res,
          next,
        },
      );
    },

    async setNodeDefaultOpen(req, res, next) {
      defaultAsyncController(
        async (req) => {
          const { id } = req.params;
          const { node_key: nodeKey, default_open: defaultOpen } = req.body;
          if (!id) throw new Error("Id tidak boleh kosong!");
          if (typeof nodeKey !== "string" || !nodeKey) {
            throw new Error("Node key tidak boleh kosong!");
          }
          if (typeof defaultOpen !== "boolean") {
            throw new Error("Default open harus berupa boolean!");
          }
          return Service.setNodeDefaultOpen(id, nodeKey, defaultOpen);
        },
        {
          req,
          res,
          next,
        },
      );
    },

    async setNodeOrder(req, res, next) {
      defaultAsyncController(
        async (req) => {
          const { id } = req.params;
          const { parent_node_key: parentNodeKey, node_keys: nodeKeys } =
            req.body;
          if (!id) throw new Error("Id tidak boleh kosong!");
          if (
            parentNodeKey != null &&
            (typeof parentNodeKey !== "string" || !parentNodeKey)
          ) {
            throw new Error("Parent node key tidak valid!");
          }
          if (
            !Array.isArray(nodeKeys) ||
            nodeKeys.some(
              (nodeKey) => typeof nodeKey !== "string" || !nodeKey,
            )
          ) {
            throw new Error("Node keys harus berupa array string!");
          }
          return Service.setNodeOrder(id, parentNodeKey, nodeKeys);
        },
        {
          req,
          res,
          next,
        },
      );
    },
  },
});

export default Controller;
