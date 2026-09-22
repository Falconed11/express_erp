import transactionHelper from "../../../helpers/transaction.cjs";
import database from "../../../repositories/db.2.0.0.cjs";
import produkKeluarRepository from "../../../repositories/produkkeluar.cjs";

const { withTransaction } = transactionHelper;
const { pool } = database;

const toPositiveNumber = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0)
    throw new Error(`${fieldName} harus lebih dari 0.`);
  return number;
};

const toId = (value, fieldName) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0)
    throw new Error(`${fieldName} tidak valid.`);
  return id;
};

const normalizeInput = (input, createdBy) => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Data pengeluaran produk tidak valid.");

  const allocations = input.stockOut.map((allocation) => ({
    id_produkmasuk: toId(allocation?.stockInId, "Stok produk masuk"),
    jumlah: toPositiveNumber(allocation?.quantity, "Jumlah stok produk masuk"),
  }));
  const allocatedQuantity = allocations.reduce(
    (total, allocation) => total + allocation.jumlah,
    0,
  );

  return {
    id_produk: toId(input.productId, "Produk"),
    id_proyek: toId(input.projectId, "Proyek"),
    tanggal: input.date,
    keterangan: input.desc.trim(),
    jumlah: allocatedQuantity,
    produkmasuk: allocations,
    metodepengeluaran: "proyek",
    isSelected: true,
    created_by: createdBy,
    updated_by: createdBy,
  };
};

const Service = {
  async create({ input, created_by }) {
    const expense = normalizeInput(input, created_by);

    return withTransaction(pool, async (conn) => {
      const result = await produkKeluarRepository.createInTransaction(
        expense,
        conn,
      );
      return { count: 1, results: [result] };
    });
  },

  async destroy(id) {
    const productExpenseId = toId(id, "Produk keluar");
    return withTransaction(pool, (conn) =>
      produkKeluarRepository.destroyInTransaction(productExpenseId, conn),
    );
  },
};

export default Service;
