const MANAGEMENT_ROLES = new Set(["super", "owner", "head-sales"]);
const VIEW_ROLES = new Set([...MANAGEMENT_ROLES, "sales"]);

const invalidInput = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const denied = () => {
  const error = new Error("Anda tidak memiliki akses ke target sales.");
  error.statusCode = 403;
  return error;
};

const parseDate = (value, label) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number(value.slice(0, 4)) < 1000
  ) {
    throw invalidInput(`${label} harus berupa tanggal YYYY-MM-DD yang valid.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw invalidInput(`${label} harus berupa tanggal YYYY-MM-DD yang valid.`);
  }
  return value;
};

const parsePositiveIds = (value, label) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidInput(`${label} wajib dipilih.`);
  }
  const ids = [...new Set(value.map(Number))];
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw invalidInput(`${label} tidak valid.`);
  }
  return ids;
};

const parseEmployeeFilter = (value) => {
  const values = (Array.isArray(value) ? value : [value]).flatMap((item) =>
    String(item).split(","),
  );
  if (values.every((item) => item === "")) return [];

  const ids = [...new Set(values.map(Number))];
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw invalidInput("Karyawan tidak valid.");
  }
  return ids.length === 1 ? ids[0] : ids;
};

const parseTargetAmount = (value, isVisitTarget) => {
  const amount = Number(value);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (isVisitTarget &&
      (!Number.isSafeInteger(amount) || amount > 2147483647)) ||
    (!isVisitTarget && amount > Number.MAX_SAFE_INTEGER)
  ) {
    throw invalidInput(
      isVisitTarget
        ? "Jumlah target kunjungan harus berupa bilangan bulat positif."
        : "Jumlah target omset harus berupa angka positif.",
    );
  }
  return amount;
};

const getAuditId = (user) =>
  Number.isSafeInteger(Number(user.id_karyawan))
    ? Number(user.id_karyawan)
    : null;

const parsePage = (value, fallback, maximum) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw invalidInput("Parameter halaman tidak valid.");
  }
  return parsed;
};

const getScope = (user) => {
  if (!VIEW_ROLES.has(user?.peran)) throw denied();

  if (user.peran === "sales") {
    const idKaryawan = Number(user.id_karyawan);
    if (!Number.isSafeInteger(idKaryawan) || idKaryawan <= 0) throw denied();
    return { canManage: false, idKaryawan };
  }

  return { canManage: MANAGEMENT_ROLES.has(user.peran), idKaryawan: null };
};

export const createTargetSalesService = (model, { isVisitTarget }) => ({
  async list({ from, to, id_karyawan: requestedEmployeeId, page, pageSize, user }) {
    const scope = getScope(user);
    const startDate = from ? parseDate(from, "Tanggal awal") : null;
    const endDate = to ? parseDate(to, "Tanggal akhir") : null;
    if (startDate && endDate && startDate > endDate) {
      throw invalidInput("Tanggal awal tidak boleh melewati tanggal akhir.");
    }

    const idKaryawan =
      scope.idKaryawan ??
      (requestedEmployeeId === undefined || requestedEmployeeId === null
        ? null
        : parseEmployeeFilter(requestedEmployeeId));

    return model.list({
      from: startDate,
      to: endDate,
      idKaryawan,
      page: parsePage(page, 1, Number.MAX_SAFE_INTEGER),
      pageSize: parsePage(pageSize, 25, 100),
    });
  },

  async summary({
    from,
    to,
    id_karyawan: requestedEmployeeId,
    group_by: requestedGroupBy,
    group_period: requestedGroupPeriod,
    user,
  }) {
    const scope = getScope(user);
    const startDate = from ? parseDate(from, "Tanggal awal") : null;
    const endDate = to ? parseDate(to, "Tanggal akhir") : null;
    if (startDate && endDate && startDate > endDate) {
      throw invalidInput("Tanggal awal tidak boleh melewati tanggal akhir.");
    }
    const groupBy = requestedGroupBy ?? "";
    const groupPeriod = requestedGroupPeriod ?? "";
    if (groupBy && !["karyawan", "week", "month"].includes(groupBy)) {
      throw invalidInput("Pengelompokan target sales tidak valid.");
    }
    if (groupPeriod && !["week", "month"].includes(groupPeriod)) {
      throw invalidInput("Pengelompokan target sales tidak valid.");
    }
    const legacyGroupPeriod = ["week", "month"].includes(groupBy) ? groupBy : "";
    if (legacyGroupPeriod && groupPeriod && legacyGroupPeriod !== groupPeriod) {
      throw invalidInput("Pengelompokan target sales tidak valid.");
    }
    const selectedGroupPeriod = groupPeriod || legacyGroupPeriod;
    const idKaryawan =
      scope.idKaryawan ??
      (requestedEmployeeId === undefined || requestedEmployeeId === null
        ? null
        : parseEmployeeFilter(requestedEmployeeId));
    const filters = {
      from: startDate,
      to: endDate,
      idKaryawan,
    };
    const result =
      groupBy === "karyawan"
        ? await model.summarizeByEmployee({
            ...filters,
            ...(selectedGroupPeriod
              ? { groupPeriod: selectedGroupPeriod }
              : {}),
          })
        : selectedGroupPeriod
          ? await model.summarizeByPeriod({
              ...filters,
              groupBy: selectedGroupPeriod,
            })
          : await model.summarize(filters);
    const total = Number(result.total ?? 0);
    const achieved = Number(result.achieved ?? 0);
    return {
      ...result,
      total,
      achieved,
      remaining: Math.max(total - achieved, 0),
    };
  },

  async create({ tanggal, jumlah, id_karyawan: employeeIds }, user) {
    const scope = getScope(user);
    if (!scope.canManage) throw denied();

    const date = parseDate(tanggal, "Tanggal target");
    const amount = parseTargetAmount(jumlah, isVisitTarget);
    if (!Array.isArray(employeeIds)) {
      throw invalidInput("Karyawan wajib dipilih.");
    }
    const ids = parsePositiveIds(employeeIds, "Karyawan");
    return model.createMany({
      tanggal: date,
      jumlah: amount,
      employeeIds: ids,
      auditId: getAuditId(user),
    });
  },

  async update(id, { tanggal, jumlah, id_karyawan: requestedEmployeeId }, user) {
    const scope = getScope(user);
    if (!scope.canManage) throw denied();

    const [targetId] = parsePositiveIds([id], "Baris target");
    const [employeeId] = parsePositiveIds(
      [requestedEmployeeId],
      "Karyawan",
    );
    return model.updateOne({
      id: targetId,
      tanggal: parseDate(tanggal, "Tanggal target"),
      jumlah: parseTargetAmount(jumlah, isVisitTarget),
      idKaryawan: employeeId,
      auditId: getAuditId(user),
    });
  },

  async deleteMany({ ids }, user) {
    const scope = getScope(user);
    if (!scope.canManage) throw denied();
    return model.deleteMany(parsePositiveIds(ids, "Baris target"));
  },
});
