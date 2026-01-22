import GolonganInstansi from "../models/golongan-instansi.model.js";
const NAME = "golongan instansi";
const GolonganInstansiService = {
  async create(data) {
    if (!data.nama) {
      throw new Error(`Nama ${NAME} is required`);
    }
    return await GolonganInstansi.create({
      nama: data.nama,
      keterangan: data.keterangan || "",
      authorid_karyawan: data.authorid_karyawan,
      lastid_karyawan: data.lastid_karyawan,
    });
  },

  async getAll(data) {
    return await GolonganInstansi.getAll(data);
  },

  async getById(id) {
    const result = await GolonganInstansi.getById(id);
    if (!result) {
      throw new Error(`Id ${NAME} not found`);
    }
    return result;
  },

  async patch(id, data) {
    if (!id) {
      throw new Error("ID is required");
    }
    const result = await GolonganInstansi.patch(id, data);
    if (result.affectedRows === 0) {
      throw new Error("No data updated");
    }
    return result;
  },

  async delete(id) {
    const result = await GolonganInstansi.delete(id);
    if (result.affectedRows === 0) {
      throw new Error(`Id ${NAME} not found`);
    }
    return result;
  },
};
export default GolonganInstansiService;
