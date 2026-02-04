export const parsePeriode = (periode) => {
  if (!periode || typeof periode !== "string") {
    throw new Error("Periode is required");
  }

  const match = /^(\d{4})-(\d{2})$/.exec(periode);
  if (!match) {
    throw new Error("Periode must be in YYYY-MM format");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    throw new Error("Periode must be in YYYY-MM format");
  }

  return { year, month };
};

export const buildMonthlyRange = (year, month) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  return { start, end };
};
