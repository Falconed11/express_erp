import * as Service from "./keterangan-khusus-penawaran.service.js";

const respondError = (res, error) =>
  res.status(error.statusCode || 400).json({
    success: false,
    message: error.message || "Gagal memproses keterangan khusus penawaran.",
  });

export const list = async (req, res) => {
  try {
    res.json(await Service.list(req.query));
  } catch (error) {
    respondError(res, error);
  }
};

export const create = async (req, res) => {
  try {
    const data = await Service.create(req.body, req.user);
    res
      .status(201)
      .json({ message: "Keterangan khusus berhasil ditambahkan", data });
  } catch (error) {
    respondError(res, error);
  }
};

export const update = async (req, res) => {
  try {
    const data = await Service.update(
      { ...req.body, id: req.params.id },
      req.user,
    );
    res.json({ message: "Keterangan khusus berhasil diubah", data });
  } catch (error) {
    respondError(res, error);
  }
};

export const remove = async (req, res) => {
  try {
    const data = await Service.remove(
      { ...req.query, id: req.params.id },
      req.user,
    );
    res.json({ message: "Keterangan khusus berhasil dihapus", data });
  } catch (error) {
    respondError(res, error);
  }
};
