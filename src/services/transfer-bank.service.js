import TransferBank from "../models/transfer-bank.model.js";
const NAME = "transfer bank";
const TransferBankService = {
  async create(data) {
    if (!data.id_metode_pembayaran_asal) {
      throw new Error(`ID metode pembayaran asal is required`);
    }
    if (!data.id_metode_pembayaran_tujuan) {
      throw new Error(`ID metode pembayaran tujuan is required`);
    }
    if (!data.nominal) {
      throw new Error(`Nominal is required`);
    }
    return await TransferBank.create(data);
  },

  async getAll(data) {
    return await TransferBank.getAll(data);
  },

  async getById(id) {
    const result = await TransferBank.getById(id);
    if (!result) {
      throw new Error(`Id ${NAME} not found`);
    }
    return result;
  },

  async patch(id, data) {
    if (!id) {
      throw new Error("ID is required");
    }
    const result = await TransferBank.patch(id, data);
    if (result.affectedRows === 0) {
      throw new Error("No data updated");
    }
    return result;
  },

  async delete(id) {
    const result = await TransferBank.delete(id);
    if (result.affectedRows === 0) {
      throw new Error(`Id ${NAME} not found`);
    }
    return result;
  },
};
export default TransferBankService;
