import produkRepo from "../../../repositories/produk.cjs";
import Model from "./produk.model.js";
import { findProductCandidates } from "./produk-matching.service.js";

const Service = {
  async getAll(filters) {
    return produkRepo.list(filters);
  },

  async getCandidates({ nama = "", merek = "", tipe = "" }) {
    if (!nama.trim() && !merek.trim() && !tipe.trim()) return [];
    const products = await produkRepo.list({ aktif: 1 });
    return findProductCandidates(products, { nama, merek, tipe });
  },

  async create(data) {
    return produkRepo.create(data);
  },

  async getById(id) {
    const result = await produkRepo.list({ id });
    if (!result || result.length === 0) {
      throw new Error("Data not found");
    }
    return result[0];
  },

  async patch(id, data) {
    console.log(id);
    const result = await Model.patch(id, data);
    if (!result || result.affectedRows === 0) {
      throw new Error("No data updated");
    }
    return result;
  },

  async destroy(id) {
    const result = await produkRepo.destroy({ id });
    if (!result || result.affectedRows === 0) {
      throw new Error("Data not found");
    }
    return result;
  },

  async listKategori() {
    return produkRepo.listKategori();
  },

  async transfer(data) {
    return produkRepo.transfer(data);
  },
};

export default Service;
