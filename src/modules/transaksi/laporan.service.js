import { generateDefaultCRUDService } from "../default/default.service.js";
import Model from "./laporan.model.js";
import { withTransaction } from "../../helpers/transaction.js";

const Service = generateDefaultCRUDService({
  ...Model,
  customService: {
    async getById(id, data) {
      const result = await withTransaction(async (conn) => {
        const currentResult = await Model.getById(id, data, conn);

        if (
          !(data?.fullReport == true || data?.fullReport === "true") ||
          !data?.from
        ) {
          return currentResult;
        }

        const pastResult = await Model.getById(
          id,
          {
            ...data,
            from: undefined,
            to: data.from,
          },
          conn,
        );

        if (!Array.isArray(currentResult) || !Array.isArray(pastResult)) {
          return currentResult;
        }

        const rootId = Number(id);
        const past =
          Number(
            pastResult.find((item) => Number(item.id) === rootId)
              ?.total_balance,
          ) || 0;
        const periodBalance =
          Number(
            currentResult.find((item) => Number(item.id) === rootId)
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
  },
});

export default Service;
