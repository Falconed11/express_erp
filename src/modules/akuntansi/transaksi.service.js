import TransaksiModel from "./transaksi.model.js";
import JurnalModel from "./jurnal.model.js";
import LaporanModel from "./laporan.model.js";
import { withTransaction } from "../../helpers/transaction.js";

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

const resolveRelatedCoaIds = async (idLaporan, conn) => {
  if (!idLaporan) return [];

  const relatedCoas = await LaporanModel.getCoasWithoutValue(
    idLaporan,
    {},
    conn,
  );
  return relatedCoas
    .map((item) => item.id_coa)
    .filter((id) => id != null && id !== "");
};

const Service = {
  async getAll(data = {}) {
    const { id_laporan, ...filters } = data;

    return withTransaction(async (conn) => {
      if (!id_laporan) {
        return TransaksiModel.getAll(filters, conn);
      }

      const relatedCoaIds = await resolveRelatedCoaIds(id_laporan, conn);
      const resolvedFilters = { ...filters };

      if (relatedCoaIds.length > 0) {
        const existingCoaFilters = Array.isArray(filters.id_coa)
          ? filters.id_coa
          : filters.id_coa != null
            ? [filters.id_coa]
            : [];
        const mergedCoaIds = Array.from(
          new Set([...existingCoaFilters, ...relatedCoaIds]),
        );
        resolvedFilters.id_coa = mergedCoaIds;
      } else {
        resolvedFilters.id_coa = [];
      }

      return TransaksiModel.getAll(resolvedFilters, conn);
    });
  },
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
    console.log(data);
    validateTransaksiData(transaksi);
    try {
      const result = await withTransaction(async (conn) => {
        const jurnalResult = await JurnalModel.patch(id, jurnal, conn);
        transaksi.forEach((item) => {
          item.updated_by = jurnal.updated_by;
        });
        console.log("done");
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
  async destroy(id) {
    try {
      const result = await withTransaction(async (conn) => {
        // First, delete all transaksi for this jurnal
        const transaksiToDelete = await TransaksiModel.getAll(
          { id_jurnal: id },
          conn,
        );
        await Promise.all(
          transaksiToDelete.map((item) =>
            TransaksiModel.destroy(item.id, conn),
          ),
        );
        // Then delete the jurnal
        const jurnalResult = await JurnalModel.destroy(id, conn);
        return {
          jurnal: jurnalResult,
          transaksiDeleted: transaksiToDelete.length,
        };
      });
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
};

export default Service;
