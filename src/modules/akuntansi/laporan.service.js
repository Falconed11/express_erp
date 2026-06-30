import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./laporan.model.js";
import { withTransaction } from "../../helpers/transaction.js";

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {
    async getById(id, data) {
      const result = await withTransaction(async (conn) => {
        const isFullReport =
          data?.fullReport == true || data?.fullReport === "true";
        const currentQuery = isFullReport
          ? { ...data, type: data.type || "tree" }
          : data;

        const currentResult = await Model.getById(id, currentQuery, conn);

        if (!isFullReport || !data?.from) {
          return currentResult;
        }

        const pastQuery = {
          ...data,
          type: data.type || "tree",
          from: undefined,
          to: data.from,
        };
        const pastResult = await Model.getById(id, pastQuery, conn);
        console.log(pastResult);

        if (!Array.isArray(currentResult) || !Array.isArray(pastResult)) {
          return currentResult;
        }

        const rootId = Number(id);
        const past =
          Number(
            pastResult.find((item) => Number(item.id_laporan) === rootId)
              ?.total_balance,
          ) || 0;
        const periodBalance =
          Number(
            currentResult.find((item) => Number(item.id_laporan) === rootId)
              ?.total_balance,
          ) || 0;

        return {
          past,
          end: past + periodBalance,
          tree: currentResult,
        };
      });

      if (!result) {
        throw new Error("Data not found");
      }
      return result;
    },

    async getCoasWithoutValue(id, data) {
      const result = await withTransaction(async (conn) => {
        return Model.getCoasWithoutValue(id, data, conn);
      });

      if (!result) {
        throw new Error("Data not found");
      }
      return result;
    },
  },
});

export default Service;
