import TransaksiModel from "./transaksi.model.js";
import JurnalModel from "./jurnal.model.js";
import { withTransaction } from "../../helpers/transaction.js";

const Service = {
  getAll: async (data) => TransaksiModel.getAll(data),
  async create(data) {
    console.log(data);
    const { transaksi, ...jurnalData } = data;
    transaksi.map((item) => {
      if (!item.id_coa)
        throw new Error(
          "Service Error: id_coa wajib diisi untuk setiap transaksi",
        );
    });
    const balanceCheck = Math.abs(
      transaksi.reduce((acc, item) => {
        if (item.tipe == 1) return acc + item.amount;
        return acc - item.amount;
      }, 0),
    );
    if (balanceCheck >= 0.01) {
      throw new Error(
        `Service Error: Transaksi tidak seimbang (${balanceCheck})`,
      );
    }
    try {
      const result = await withTransaction(async (conn) => {
        const jurnalResult = await JurnalModel.create(jurnalData, conn);
        transaksi.forEach((item) => {
          item.id_jurnal = jurnalResult.insertId;
        });
        const transaksiResults = await Promise.all(
          transaksi.map((item) => TransaksiModel.create(item, conn)),
        );
        return { jurnal: jurnalResult, transaksi: transaksiResults };
      });
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  async getById(id) {
    const jurnal = await JurnalModel.getById(id);
    const transaksi = await TransaksiModel.getAll({ id_jurnal: id });
    return { ...jurnal, transaksi };
  },
};

export default Service;
