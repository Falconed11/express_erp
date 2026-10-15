import {
  deletePayment,
  generateMissingPurchaseJournal,
  getAvailablePurchaseJournals,
  getPaymentOverview,
  linkExistingPurchaseJournal,
  recordPayment,
  updatePayment,
} from "./produkmasuk-pembayaran.repository.js";

const Service = {
  getAll: getPaymentOverview,
  generatePurchaseJournal: generateMissingPurchaseJournal,
  getAvailablePurchaseJournals,
  linkPurchaseJournal: linkExistingPurchaseJournal,
  create: recordPayment,
  update: updatePayment,
  delete: deletePayment,
};

export default Service;
