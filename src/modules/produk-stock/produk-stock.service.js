import Model from "./produk-stock.model.js";
import productStockRepository from "./produk-stock.repository.cjs";
import productEntryRepository from "../../../repositories/produkmasuk.cjs";

const Service = {
  listLoans(user) {
    return Model.listLoans(Number(user?.id_perusahaan));
  },
  returnLoan(id, data, user) {
    const loanId = Number(id);
    const idPerusahaan = Number(user?.id_perusahaan);
    if (!Number.isInteger(loanId) || loanId <= 0)
      throw new Error("ID pinjaman tidak valid.");
    if (!Number.isInteger(idPerusahaan) || idPerusahaan <= 0)
      throw new Error("Perusahaan pengguna tidak valid.");
    if (!Array.isArray(data?.stockEntries) || data.stockEntries.length === 0)
      throw new Error("Pilih minimal satu stok masuk untuk dikembalikan.");
    if (
      data.stockEntries.some(
        (entry) =>
          !entry ||
          !Number.isInteger(Number(entry.id_produkmasuk)) ||
          Number(entry.id_produkmasuk) <= 0 ||
          !Number.isFinite(Number(entry.jumlah)) ||
          Number(entry.jumlah) <= 0,
      )
    )
      throw new Error("Data stok pengembalian tidak valid.");
    const tanggal = data.tanggal ?? new Date().toISOString().slice(0, 10);
    if (
      typeof tanggal !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) ||
      Number.isNaN(Date.parse(`${tanggal}T00:00:00Z`)) ||
      new Date(`${tanggal}T00:00:00Z`).toISOString().slice(0, 10) !== tanggal
    )
      throw new Error("Tanggal pengembalian tidak valid.");
    if (data.keterangan != null && typeof data.keterangan !== "string")
      throw new Error("Keterangan pengembalian tidak valid.");

    return productStockRepository.returnLoan({
      id_produkpinjaman: loanId,
      id_perusahaan: idPerusahaan,
      stockEntries: data.stockEntries,
      tanggal,
      keterangan: data.keterangan?.trim() ?? "",
      created_by: user?.id_karyawan ?? null,
    });
  },
  revertReturn(id, user) {
    const returnId = Number(id);
    const idPerusahaan = Number(user?.id_perusahaan);
    if (!Number.isInteger(returnId) || returnId <= 0)
      throw new Error("ID pengembalian tidak valid.");
    if (!Number.isInteger(idPerusahaan) || idPerusahaan <= 0)
      throw new Error("Perusahaan pengguna tidak valid.");
    return productStockRepository.revertReturn({
      id_return: returnId,
      id_perusahaan: idPerusahaan,
      updated_by: user?.id_karyawan ?? null,
    });
  },
  listUnclaimedEntries(filters, user) {
    assertCanClaimStock(user);
    return Model.listUnclaimedEntries(filters);
  },
  claimEntry(id, user) {
    assertCanClaimStock(user);
    const entryId = Number(id);
    if (!Number.isInteger(entryId) || entryId <= 0) {
      const error = new Error("ID produk masuk tidak valid.");
      error.statusCode = 400;
      throw error;
    }
    const idPerusahaan = Number(user?.id_perusahaan);
    if (!Number.isInteger(idPerusahaan) || idPerusahaan <= 0) {
      const error = new Error("Perusahaan pengguna tidak valid.");
      error.statusCode = 400;
      throw error;
    }
    return Model.claimUnclaimedEntry({
      id: entryId,
      id_perusahaan: idPerusahaan,
      updated_by: user?.id_karyawan ?? null,
    });
  },
  createEntry(data, user) {
    const idPerusahaan = Number(
      user?.id_perusahaan ?? data?.id_perusahaan,
    );
    if (!Number.isInteger(idPerusahaan) || idPerusahaan <= 0)
      throw new Error("Perusahaan belum dipilih.");
    return productEntryRepository.create({
      ...data,
      id_perusahaan: idPerusahaan,
      created_by: user?.id_karyawan ?? null,
      updated_by: user?.id_karyawan ?? null,
    });
  },
};

function assertCanClaimStock(user) {
  if (!["admin", "owner", "super"].includes(user?.peran)) {
    const error = new Error("Anda tidak memiliki akses ke data ini.");
    error.statusCode = 403;
    throw error;
  }
}

export default Service;
