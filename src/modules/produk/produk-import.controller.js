import ExcelJS from "exceljs";
import {
  commitImport,
  getImportJob,
  jobResponse,
  stageImport,
} from "../imports/import-engine.js";
import { produkImportDefinition } from "./produk-import.definition.js";

const canImport = (req) => ["owner", "super"].includes(req.user?.peran);

const fail = (res, error) =>
  res.status(error.status ?? 400).json({
    success: false,
    message: error.message,
  });

export const createProdukImport = async (req, res) => {
  if (!canImport(req)) {
    return res.status(403).json({ success: false, message: "Tidak memiliki izin import produk." });
  }
  try {
    const job = await stageImport({
      definition: produkImportDefinition,
      file: req.file,
      context: { tanggal: req.body.tanggal, id_vendor: Number(req.body.id_vendor) },
    });
    return res.status(201).json({ success: true, data: jobResponse(job) });
  } catch (error) {
    return fail(res, error);
  }
};

export const getProdukImport = (req, res) => {
  try {
    return res.json({ success: true, data: jobResponse(getImportJob(req.params.importId, "products")) });
  } catch (error) {
    return fail(res, error);
  }
};

export const getProdukImportErrors = (req, res) => {
  try {
    const job = getImportJob(req.params.importId, "products");
    return res.json({ success: true, data: { importId: job.id, errors: job.errors } });
  } catch (error) {
    return fail(res, error);
  }
};

export const commitProdukImport = async (req, res) => {
  if (!canImport(req)) {
    return res.status(403).json({ success: false, message: "Tidak memiliki izin import produk." });
  }
  try {
    const job = await commitImport({ id: req.params.importId, definition: produkImportDefinition, actor: req.user });
    return res.json({ success: true, data: jobResponse(job) });
  } catch (error) {
    return fail(res, error);
  }
};

export const downloadProdukImportSample = async (_req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Produk");
  worksheet.columns = [
    { header: "produk", key: "produk", width: 28 },
    { header: "kategori", key: "kategori", width: 22 },
    { header: "merek", key: "merek", width: 22 },
    { header: "tipe", key: "tipe", width: 20 },
    { header: "hargamodal", key: "hargamodal", width: 16 },
  ];
  worksheet.addRows([
    { produk: "iPhone 15 128GB", kategori: "Smartphone", merek: "Apple", tipe: "IP15-128", hargamodal: 12000000 },
    { produk: "Galaxy A55", kategori: "Smartphone", merek: "Samsung", tipe: "SMA55", hargamodal: 5500000 },
    { produk: "ThinkPad E14", kategori: "Laptop", merek: "Lenovo", tipe: "TPE14", hargamodal: 10500000 },
  ]);
  worksheet.getRow(1).font = { bold: true };
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="format-import-produk.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
};
