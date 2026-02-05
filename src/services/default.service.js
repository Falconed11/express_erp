import { calculate, getAll } from "../models/default.model.js";
import { buildMonthlyDateRangeFromPeriod } from "../utils/periode.utils.js";
import { assertAllowedValues } from "../utils/validation.js";

export const calculateService = async ({
  periode,
  aggregate,
  columnName,
  allowedAggregate,
  table,
}) => {
  if (periode && aggregate) {
    const { start, end } = buildMonthlyDateRangeFromPeriod(periode);
    assertAllowedValues(aggregate, allowedAggregate, "Aggregate");
    return calculate({
      aggregate,
      columnName,
      end,
      start,
      table,
    });
  }
  return getAll(table);
};
