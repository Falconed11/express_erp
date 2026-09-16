import { createInTransaction } from "../../../repositories/produkkeluar.cjs";

const Service = {
  async create(data) {
    const { productExpenses } = data;
    try {
      return withTransaction(async (conn) =>
        productExpenses.forEach((productExpense) =>
          createInTransaction(productExpense, conn),
        ),
      );
    } catch (err) {
      console.error("Error : ", err);
      throw err;
    }
    // return produkRepo.create(data);
  },
};

export default Service;
