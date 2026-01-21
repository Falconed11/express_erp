import JenisProyek from "../models/jenis-proyek.model.js";

export const JenisProyekService = {
  async create(data) {
    if (!data.nama) {
      throw new Error("Nama jenis proyek is required");
    }
    return await JenisProyek.create({
      nama: data.nama,
      keterangan: data.keterangan || "",
      authorid_karyawan: data.authorid_karyawan,
      lastid_karyawan: data.lastid_karyawan,
    });
  },

  async getAll(data) {
    return await JenisProyek.getAll(data);
  },

  async getById(id) {
    const result = await JenisProyek.getById(id);
    if (!result) {
      throw new Error("Jenis proyek not found");
    }
    return result;
  },

  async patch(id, data) {
    if (!id) {
      throw new Error("ID is required");
    }
    const result = await JenisProyek.patch(id, data);
    if (result.affectedRows === 0) {
      throw new Error("No data updated");
    }
    return result;
  },

  async delete(id) {
    const result = await JenisProyek.delete(id);
    if (result.affectedRows === 0) {
      throw new Error("Jenis proyek not found");
    }
    return result;
  },
};
