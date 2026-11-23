import assert from "node:assert/strict";
import { test } from "node:test";
import db from "../../config/knex.js";
import { buildTargetSalesAchievementQuery } from "./target-sales.model.js";

test("Omset achievement query uses completed deal penawaran values", () => {
  const query = buildTargetSalesAchievementQuery(db, {
    isVisitTarget: false,
    from: "2026-11-01",
    to: "2026-11-30",
    idKaryawan: 12,
  });
  const sql = query.toSQL().sql;

  assert.match(
    sql,
    /offer_row\.jumlah\s*\*\s*COALESCE\(offer_row\.hargakustom,\s*offer_row\.harga\)/i,
  );
  assert.match(sql, /total_penawaran/i);
  assert.match(sql, /project\.versi/i);
  assert.match(sql, /status[^a-z]*progress/i);
  assert.match(sql, /project[^a-z]*tanggal/i);
  assert.doesNotMatch(sql, /pembayaranproyek/i);
  assert.doesNotMatch(sql, /payment\.nominal/i);
});
