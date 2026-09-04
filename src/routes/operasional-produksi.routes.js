import { Router } from "express";
import repository from "../repositories/operasional-produksi.repository.js";

const router = Router();

router.get("/total", async (req, res, next) => {
  try {
    if (!req.query.id_proyek)
      return res.status(400).json({ message: "id_proyek wajib diisi" });
    res.json(await repository.total(req.query.id_proyek));
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    if (!req.query.id_proyek)
      return res.status(400).json({ message: "id_proyek wajib diisi" });
    res.json(await repository.list(req.query.id_proyek));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { id_proyek, tanggal, deskripsi, nominal } = req.body;
    if (!id_proyek || !tanggal)
      return res
        .status(400)
        .json({ message: "Proyek dan tanggal wajib diisi" });
    await repository.create({
      id_proyek,
      tanggal,
      deskripsi,
      nominal,
      created_by: req.user?.id_karyawan || null,
    });
    res.status(201).json({ message: "Data berhasil ditambahkan" });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { id_proyek, tanggal, deskripsi, nominal } = req.body;
    if (!id_proyek)
      return res.status(400).json({ message: "id_proyek wajib diisi" });
    const affectedRows = await repository.update(req.params.id, id_proyek, {
      tanggal,
      deskripsi,
      nominal,
      updated_by: req.user?.id_karyawan || null,
    });
    if (!affectedRows)
      return res.status(404).json({ message: "Data tidak ditemukan" });
    res.json({ message: "Data berhasil diubah" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!req.query.id_proyek)
      return res.status(400).json({ message: "id_proyek wajib diisi" });
    const affectedRows = await repository.destroy(
      req.params.id,
      req.query.id_proyek,
    );
    if (!affectedRows)
      return res.status(404).json({ message: "Data tidak ditemukan" });
    res.json({ message: "Data berhasil dihapus" });
  } catch (error) {
    next(error);
  }
});

export default router;
