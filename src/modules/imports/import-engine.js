import ExcelJS from "exceljs";
import { randomUUID } from "node:crypto";

const JOB_TTL_MS = 30 * 60 * 1000;
const jobs = new Map();

export const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

export const createImportError = (row, field, code, message) => ({
  row,
  field,
  code,
  message,
});

const cleanExpiredJobs = () => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
};

const readWorkbookRows = async (file, requiredColumns) => {
  if (!file?.buffer) throw new Error("File Excel wajib diunggah.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Workbook tidak memiliki worksheet.");

  const headers = {};
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
    headers[normalizeText(cell.text).toLowerCase()] = column;
  });

  const missingColumns = requiredColumns.filter((column) => !headers[column]);
  if (missingColumns.length) {
    throw new Error(`Kolom Excel wajib: ${missingColumns.join(", ")}`);
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (worksheetRow, rowNumber) => {
    if (rowNumber === 1) return;
    const values = {};
    let hasValue = false;
    for (const column of requiredColumns) {
      const cell = worksheetRow.getCell(headers[column]);
      const value = cell.value instanceof Date ? cell.value : cell.text;
      values[column] = value;
      if (normalizeText(value)) hasValue = true;
    }
    if (hasValue) rows.push({ rowNumber, values });
  });

  if (!rows.length) throw new Error("File Excel tidak memiliki data.");
  return rows;
};

export const stageImport = async ({ definition, file, context }) => {
  cleanExpiredJobs();
  const sourceRows = await readWorkbookRows(file, definition.columns);
  const rows = sourceRows.map(({ rowNumber, values }) => ({
    rowNumber,
    ...definition.normalize(values),
  }));
  const errors = definition.validate(rows, context);
  const preview = await definition.preview(rows, errors, context);
  const id = randomUUID();
  const job = {
    id,
    type: definition.type,
    status: "PREVIEW_READY",
    createdAt: Date.now(),
    context,
    rows,
    errors,
    preview,
  };
  jobs.set(id, job);
  return job;
};

export const getImportJob = (id, type) => {
  cleanExpiredJobs();
  const job = jobs.get(id);
  if (!job || job.type !== type) {
    const error = new Error("Import tidak ditemukan atau sudah kedaluwarsa.");
    error.status = 404;
    throw error;
  }
  return job;
};

export const commitImport = async ({ id, definition, actor }) => {
  const job = getImportJob(id, definition.type);
  if (job.status !== "PREVIEW_READY") {
    throw new Error("Import belum siap untuk dikonfirmasi.");
  }
  if (job.errors.length) {
    const error = new Error("Import memiliki baris tidak valid dan tidak dapat diproses.");
    error.status = 422;
    throw error;
  }

  job.status = "COMMITTING";
  try {
    const result = await definition.commit(job, actor);
    job.status = "COMPLETED";
    job.completedAt = Date.now();
    job.result = result;
    return job;
  } catch (error) {
    job.status = "FAILED";
    job.failure = error.message;
    throw error;
  }
};

export const jobResponse = (job) => ({
  importId: job.id,
  status: job.status,
  preview: job.preview,
  errors: job.errors,
  result: job.result ?? null,
});
