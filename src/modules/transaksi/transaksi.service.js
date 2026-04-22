import TransaksiModel from "./transaksi.model.js";
import JurnalModel from "./jurnal.model.js";
import { withTransaction } from "../../helpers/transaction.js";
import { patch } from "../../models/default.model.js";

const validateTransaksiData = (transaksi) => {
  transaksi.map((item) => {
    if (!item.id_coa)
      throw new Error(
        "Service Error: id_coa wajib diisi untuk setiap transaksi",
      );
  });
  const balanceCheck = Math.abs(
    transaksi.reduce((acc, item) => {
      if (item.tipe == 1) return acc + +item.amount;
      return acc - item.amount;
    }, 0),
  );
  if (balanceCheck >= 0.01) {
    throw new Error(
      `Service Error: Transaksi tidak seimbang (${balanceCheck})`,
    );
  }
};

const Service = {
  getAll: async (data) => TransaksiModel.getAll(data),
  async create(data) {
    const { transaksi, ...jurnal } = data;
    validateTransaksiData(transaksi);
    try {
      const result = await withTransaction(async (conn) => {
        const jurnalResult = await JurnalModel.create(jurnal, conn);
        transaksi.forEach((item) => {
          item.id_jurnal = jurnalResult.insertId;
          item.created_by = jurnal.created_by;
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
  async patch(id, data) {
    const { transaksi, ...jurnal } = data;
    // console.log(jurnal);
    validateTransaksiData(transaksi);
    try {
      const result = await withTransaction(async (conn) => {
        const jurnalResult = await JurnalModel.patch(id, jurnal, conn);
        transaksi.forEach((item) => {
          item.updated_by = jurnal.updated_by;
        });
        const transaksiResults = await Promise.all(
          transaksi.map(({ id, ...data }) =>
            TransaksiModel.patch(id, data, conn),
          ),
        );
        return { jurnal: jurnalResult, transaksi: transaksiResults };
      });
      console.log(result);
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
};

export default Service;
