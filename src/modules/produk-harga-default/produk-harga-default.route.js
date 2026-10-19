import { Router } from "express";
import Service from "./produk-harga-default.service.js";

const router = Router();
const canManage = (req) => ["owner", "super"].includes(req.user?.peran);
const forbid = (res) =>
  res.status(403).json({
    success: false,
    message: "Hanya owner atau super yang dapat mengatur default harga produk.",
  });
const fail = (res, error) =>
  res
    .status(error.status ?? 400)
    .json({ success: false, message: error.message });

router.get("/", async (req, res) => {
  try {
    return res.json({ success: true, data: await Service.list() });
  } catch (error) {
    return fail(res, error);
  }
});

router.post("/", async (req, res) => {
  if (!canManage(req)) return forbid(res);
  try {
    const data = await Service.create(req.body, req.user?.id_karyawan ?? null);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
});

router.patch("/:id", async (req, res) => {
  if (!canManage(req)) return forbid(res);
  try {
    const data = await Service.update(
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
    const data = await Service.delete(
      req.params.id,
      req.user?.id_karyawan ?? null,
    );
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
});

export default router;
