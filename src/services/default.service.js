import { calculate, getAll, getByPeriode } from "../models/default.model.js";
import { buildMonthlyDateRangeFromPeriod } from "../utils/periode.utils.js";
import { assertAllowedValues } from "../utils/validation.js";

export const calculateService = async ({
  periode,
  aggregate,
  from,
  to,
  allowedAggregate,
  ...rest
}) => {
  if (aggregate) {
    const { from: start, to: end } = periode
      ? buildMonthlyDateRangeFromPeriod(periode)
      : { from, to };
    assertAllowedValues(aggregate, allowedAggregate, "Aggregate");
    return calculate({
      ...rest,
      aggregate,
      to: end,
      from: start,
      allowedAggregate,
    });
  }
  return getAll(table);
};

export const getByPeriodeService = (
  table,
  periode,
  idPerusahaan,
  buildLeftJoin,
  select,
) => {
  const { start, end } = buildMonthlyDateRangeFromPeriod(periode);
  return getByPeriode(table, start, end, idPerusahaan, buildLeftJoin, select);
};
