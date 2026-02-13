import { calculate, getAll, getByPeriode } from "../models/default.model.js";
import { buildMonthlyDateRangeFromPeriod } from "../utils/periode.utils.js";
import { assertAllowedValues } from "../utils/validation.js";

export const calculateService = async ({
  periode,
  aggregate,
  columnName,
  allowedAggregate,
  customVal,
  customWhere,
  buildCustomJoin,
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
      customVal,
      customWhere,
      buildCustomJoin,
    });
  }
  return getAll(table);
};

export const getByPeriodeService = (table, periode, idPerusahaan) => {
  const { start, end } = buildMonthlyDateRangeFromPeriod(periode);
  return getByPeriode(table, start, end, idPerusahaan);
};
