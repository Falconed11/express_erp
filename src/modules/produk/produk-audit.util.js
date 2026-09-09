export const PRODUCT_AUDIT_FIELDS = [
  "id_kategori",
  "id_kustom",
  "nama",
  "id_merek",
  "tipe",
  "stok",
  "satuan",
  "hargamodal",
  "hargajual",
  "tanggal",
  "keterangan",
  "aktif",
];

import {
  buildAuditEntry,
  normalizeAuditValue,
} from "../../utils/audit.util.js";

export { normalizeAuditValue };

export const buildProductAuditEntries = ({
  id_produk,
  action,
  before = {},
  after = {},
  changed_by,
  changed_at,
}) => {
  return buildAuditEntry({
    tableName: "produk",
    recordId: id_produk,
    action,
    before,
    after,
    fields: PRODUCT_AUDIT_FIELDS,
    changedBy: changed_by,
    changedAt: changed_at,
  });
};
