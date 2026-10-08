import Model from "./produk-stock.model.js";
import productEntryRepository from "../../../repositories/produkmasuk.cjs";

const Service = {
  listLoans(user) {
    return Model.listLoans(Number(user?.id_perusahaan));
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
