export const assertAllowedValues = (value, allowed, label = "Nilai") => {
  if (!allowed.includes(value)) {
    throw new Error(
      `${label} tidak valid! Hanya menerima: ${allowed.join(", ")}`,
    );
  }
  return { value };
};

export const validateYearMonth = (yearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match)
    return { valid: false, message: "Periode must be in YYYY-MM format" };
  return { valid: true };
};
