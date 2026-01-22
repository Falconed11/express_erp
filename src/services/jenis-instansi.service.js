import JenisInstansi from "../models/jenis-instansi.model.js";
const NAME = "jenis proyek";
const JenisInstansiService = {
  async create(data) {
    if (!data.nama) {
      throw new Error(`Nama ${NAME} is required`);
    }
    return await JenisInstansi.create({
      nama: data.nama,
      keterangan: data.keterangan || "",
      authorid_karyawan: data.authorid_karyawan,
      lastid_karyawan: data.lastid_karyawan,
    });
  },

  async getAll(data) {
    return await JenisInstansi.getAll(data);
  },

  async getById(id) {
    const result = await JenisInstansi.getById(id);
    if (!result) {
      throw new Error(`Id ${NAME} not found`);
    }
    return result;
  },

  async patch(id, data) {
    if (!id) {
      throw new Error("ID is required");
    }
    const result = await JenisInstansi.patch(id, data);
    if (result.affectedRows === 0) {
      throw new Error("No data updated");
    }
    return result;
  },

  async delete(id) {
    const result = await JenisInstansi.delete(id);
    if (result.affectedRows === 0) {
      throw new Error(`Id ${NAME} not found`);
    }
    return result;
  },
};
export default JenisInstansiService;
