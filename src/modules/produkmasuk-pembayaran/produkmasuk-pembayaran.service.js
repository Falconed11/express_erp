import {
  deletePayment,
  getPaymentOverview,
  recordPayment,
  updatePayment,
} from "./produkmasuk-pembayaran.repository.js";

const Service = {
  getAll: getPaymentOverview,
  create: recordPayment,
  update: updatePayment,
  delete: deletePayment,
};

export default Service;
