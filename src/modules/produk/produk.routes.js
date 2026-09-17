import { Router } from "express";
import multer from "multer";
import Controller from "./produk.controller.js";
import {
  commitProdukImport,
  createProdukImport,
  downloadProdukImportSample,
  getProdukImport,
  getProdukImportErrors,
} from "./produk-import.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const isXlsx = file.originalname?.toLowerCase().endsWith(".xlsx");
    if (!isXlsx) return callback(new Error("File harus berformat .xlsx."));
    callback(null, true);
  },
});

router.get("/", Controller.getAll);
router.post("/", Controller.create);
router.get("/imports/sample", downloadProdukImportSample);
router.post("/imports", upload.single("file"), createProdukImport);
router.get("/imports/:importId", getProdukImport);
router.get("/imports/:importId/preview", getProdukImport);
router.get("/imports/:importId/errors", getProdukImportErrors);
router.post("/imports/:importId/commit", commitProdukImport);
router.get("/kategori", Controller.getKategori);
router.get("/candidates", Controller.getCandidates);
router.get("/audit", Controller.getAuditLogs);
router.post("/transfer", Controller.transfer);
router.get("/:id", Controller.getById);
router.patch("/:id", Controller.patch);
router.delete("/:id", Controller.destroy);

export default router;
