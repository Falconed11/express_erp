const PANEL_DIRECTIONS = {
  kunjungan: "minimum",
  omset: "minimum",
  "project-status": "minimum",
  "durasi-proyek": "maximum",
};
const VIEW_ROLES = new Set(["sales", "head-sales", "owner", "super"]);
const MAX_GRADES = 26;
const MAX_THRESHOLD = 1_000_000_000_000;

const invalidInput = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const denied = () => {
  const error = new Error("Anda tidak memiliki akses ke konfigurasi nilai.");
  error.statusCode = 403;
  return error;
};

const canManage = (user) => {
  if (user?.rank === null || user?.rank === undefined || user.rank === "") {
    return false;
  }
  const rank = Number(user.rank);
  return Number.isFinite(rank) && rank <= 20;
};

const validateViewer = (user) => {
  if (!VIEW_ROLES.has(user?.peran)) throw denied();
};

const normalizeGrades = (panel, grades) => {
  if (!Array.isArray(grades) || grades.length > MAX_GRADES) {
    throw invalidInput(`Maksimal ${MAX_GRADES} grade dapat disimpan.`);
  }
  const thresholds = new Set();
  return grades.map((grade) => {
    const rawThreshold = String(grade?.threshold ?? "").trim();
    const threshold = Number(rawThreshold);
    const decimals = rawThreshold.includes(".")
      ? rawThreshold.split(".")[1].length
      : 0;
    if (
      !rawThreshold ||
      !Number.isFinite(threshold) ||
      threshold < 0 ||
      threshold > MAX_THRESHOLD ||
      decimals > 4
    ) {
      throw invalidInput("Batas grade harus berupa angka valid dan tidak negatif.");
    }
    if (thresholds.has(threshold)) {
      throw invalidInput("Batas setiap grade harus berbeda.");
    }
    thresholds.add(threshold);

    const message = String(grade?.message ?? "").trim();
    if (message.length > 500) {
      throw invalidInput("Pesan grade maksimal 500 karakter.");
    }
    return { threshold, message };
  }).sort((left, right) =>
    PANEL_DIRECTIONS[panel] === "maximum"
      ? left.threshold - right.threshold
      : right.threshold - left.threshold,
  );
};

const getGradeName = (index) => String.fromCharCode(65 + index);

const formatRules = (rows) => {
  const result = Object.fromEntries(
    Object.keys(PANEL_DIRECTIONS).map((panel) => [panel, []]),
  );
  for (const row of rows) {
    if (!result[row.panel]) continue;
    result[row.panel].push({
      threshold: Number(row.threshold),
      message: row.message,
    });
  }
  for (const [panel, grades] of Object.entries(result)) {
    grades.sort((left, right) =>
      PANEL_DIRECTIONS[panel] === "maximum"
        ? left.threshold - right.threshold
        : right.threshold - left.threshold,
    );
    result[panel] = grades.map((grade, index) => ({
      ...grade,
      grade: getGradeName(index),
    }));
  }
  return result;
};

export const createReportGradesService = (model) => {
  const listRules = async () => formatRules(await model.listAll());
  return {
    async list(user) {
      validateViewer(user);
      return listRules();
    },

    async replacePanel(panel, grades, user) {
      validateViewer(user);
      if (!canManage(user)) throw denied();
      if (!Object.hasOwn(PANEL_DIRECTIONS, panel)) {
        throw invalidInput("Panel nilai tidak valid.");
      }
      const normalizedGrades = normalizeGrades(panel, grades);
      await model.replacePanel(panel, normalizedGrades);
      return listRules();
    },
  };
};
