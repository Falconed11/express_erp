import { Router } from "express";
import Service from "./perusahaan-pajak-default.service.js";

const router = Router();
const canManage = (req) => ["owner", "super"].includes(req.user?.peran);
const companyId = (req) => Number(req.user?.id_perusahaan);
const fail = (res, error) =>
  res
    .status(error.status ?? 400)
    .json({ success: false, message: error.message });
const forbid = (res) =>
  res
    .status(403)
    .json({ success: false, message: "Akses konfigurasi pajak ditolak." });

router.get("/active", async (req, res) => {
  try {
    const idPerusahaan = companyId(req);
    if (!Number.isInteger(idPerusahaan) || idPerusahaan <= 0)
      return res.json({ success: true, data: null });
    return res.json({
      success: true,
      data: await Service.getActive(idPerusahaan),
    });
  } catch (error) {
    return fail(res, error);
  }
});

router.get("/", async (req, res) => {
  try {
    return res.json({
      success: true,
      data: await Service.list(companyId(req)),
    });
  } catch (error) {
    return fail(res, error);
  }
});

router.post("/", async (req, res) => {
  if (!canManage(req)) return forbid(res);
  try {
    const data = await Service.create(
      companyId(req),
      req.body,
      req.user?.id_karyawan ?? null,
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
});

router.patch("/:id/activate", async (req, res) => {
  if (!canManage(req)) return forbid(res);
  try {
    const data = await Service.setActive(
      companyId(req),
      req.params.id,
      req.user?.id_karyawan ?? null,
    );
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
});

router.patch("/:id/deactivate", async (req, res) => {
  if (!canManage(req)) return forbid(res);
  try {
    const data = await Service.deactivate(
      companyId(req),
      req.params.id,
      req.user?.id_karyawan ?? null,
    );
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
});

router.patch("/:id", async (req, res) => {
  if (!canManage(req)) return forbid(res);
  try {
    const data = await Service.update(
      companyId(req),
      req.params.id,
      req.body,
      req.user?.id_karyawan ?? null,
    );
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
});

router.delete("/:id", async (req, res) => {
  if (!canManage(req)) return forbid(res);
  try {
    const data = await Service.remove(companyId(req), req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
});

export default router;
