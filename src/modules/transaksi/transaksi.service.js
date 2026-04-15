import TransaksiModel from "./transaksi.model.js";
import JurnalModel from "./jurnal.model.js";
import { withTransaction } from "../../helpers/transaction.js";

const Service = {
  getAll: async (data) => TransaksiModel.getAll(data),
  async create(data) {
    const { transaksi, ...jurnalData } = data;

    const balanceCheck = transaksi.reduce((acc, item) => {
      return acc + item.amount;
    }, 0);
    if (balanceCheck !== 0) {
      throw new Error("Service Error: Transaksi tidak seimbang");
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
};

export default Service;
