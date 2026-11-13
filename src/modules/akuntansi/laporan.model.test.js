import assert from "node:assert/strict";
import test from "node:test";
import Model from "./laporan.model.js";

test("tree reports support an exclusive upper date bound", async () => {
  let query;
  let values;
  const connection = {
    async execute(sql, params) {
      query = sql;
      values = params;
      return [[], []];
    },
  };

  await Model.getById(
    1,
    { type: "tree", to: "2025-10-01" },
    connection,
    { toExclusive: true },
  );

  assert.match(query, /AND j\.tanggal < \?/);
  assert.ok(values.includes("2025-10-01"));
});

test("tree reports retain an inclusive upper date bound by default", async () => {
  let query;
  const connection = {
    async execute(sql) {
      query = sql;
      return [[], []];
    },
  };

  await Model.getById(1, { type: "tree", to: "2025-10-01" }, connection);

  assert.match(query, /AND j\.tanggal <= \?/);
});
