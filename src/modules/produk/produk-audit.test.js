import test from "node:test";
import assert from "node:assert/strict";
import { buildProductAuditEntries } from "./produk-audit.util.js";

test("buildProductAuditEntries combines actual field changes into one report", () => {
  const entries = buildProductAuditEntries({
    id_produk: 7,
    action: "update",
    before: { nama: "A", tipe: "X", stok: 10, keterangan: "awal" },
    after: { nama: "B", tipe: "X", stok: 15, keterangan: "awal" },
    changed_by: 12,
    changed_at: "2026-09-09T10:00:00Z",
  });

  assert.deepEqual(entries, [
    {
      table_name: "produk",
      record_id: 7,
      action: "update",
      changes: {
        nama: { before: "A", after: "B" },
        stok: { before: 10, after: 15 },
      },
      changed_by: 12,
      changed_at: "2026-09-09T10:00:00Z",
    },
  ]);
});
