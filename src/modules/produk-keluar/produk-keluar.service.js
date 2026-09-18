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

const normalizeExpense = (expense, createdBy) => {
  if (!expense || typeof expense !== "object" || Array.isArray(expense))
    throw new Error("Data pengeluaran produk tidak valid.");

  if (!Array.isArray(expense.produkmasuk) || expense.produkmasuk.length === 0)
    throw new Error("Pilih minimal satu stok produk masuk.");

  const allocations = expense.produkmasuk.map((allocation) => ({
    id_produkmasuk: toId(allocation?.id_produkmasuk, "Stok produk masuk"),
    jumlah: toPositiveNumber(allocation?.jumlah, "Jumlah stok produk masuk"),
  }));
  const allocatedQuantity = allocations.reduce(
    (total, allocation) => total + allocation.jumlah,
    0,
  );
  const quantity = toPositiveNumber(expense.jumlah, "Jumlah");

  if (quantity !== allocatedQuantity)
    throw new Error("Jumlah harus sama dengan total stok produk masuk yang dipilih.");

  return {
    id_produk: toId(expense.id_produk, "Produk"),
    id_proyek: expense.id_proyek
      ? toId(expense.id_proyek, "Proyek")
      : null,
    tanggal: expense.tanggal || new Date().toISOString().slice(0, 10),
    keterangan: String(expense.keterangan || "").trim(),
    jumlah: quantity,
    produkmasuk: allocations,
    metodepengeluaran: "proyek",
    isSelected: true,
    created_by: createdBy,
    updated_by: createdBy,
  };
};

const Service = {
  async create({ productExpenses, created_by }) {
    if (!Array.isArray(productExpenses) || productExpenses.length === 0)
      throw new Error("Pengeluaran produk tidak boleh kosong!");

    const expenses = productExpenses
      .map((expense) => normalizeExpense(expense, created_by))
      // A stable lock order reduces deadlock risk for multi-product requests.
      .sort((left, right) => left.id_produk - right.id_produk);

    return withTransaction(pool, async (conn) => {
      const results = [];
      for (const expense of expenses) {
        results.push(
          await produkKeluarRepository.createInTransaction(expense, conn),
        );
      }
      return { count: results.length, results };
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
