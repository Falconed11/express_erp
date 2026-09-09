export const normalizeAuditValue = (value) => {
  if (value === undefined || value === null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return JSON.stringify(value);
};

export const getIndonesiaDateTime = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
};

export const buildAuditEntry = ({
  tableName,
  recordId,
  action,
  before = {},
  after = {},
  fields,
  changedBy,
  changedAt,
}) => {
  const changes = {};

  for (const field of fields) {
    const beforeValue = normalizeAuditValue(before[field]);
    const afterValue = normalizeAuditValue(after[field]);
    if (beforeValue === afterValue) continue;
    changes[field] = { before: beforeValue, after: afterValue };
  }

  if (Object.keys(changes).length === 0) return [];

  return [
    {
      table_name: tableName,
      record_id: recordId,
      action,
      changes,
      changed_by: changedBy,
      changed_at: changedAt,
    },
  ];
};
