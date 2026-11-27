import assert from "node:assert/strict";
import { test } from "node:test";
import { createReportGradesModel } from "./report-grades.model.js";

test("replaces only the selected globally shared panel rules", async () => {
  const rows = [
    { panel: "kunjungan", threshold: 80, message: "Kunjungan lama" },
    { panel: "omset", threshold: 90, message: "Omset tetap" },
  ];
  const transaction = (table) => ({
    where: (criteria) => ({
      del: async () => {
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          if (rows[index].panel === criteria.panel) rows.splice(index, 1);
        }
      },
    }),
    insert: async (newRows) => rows.push(...newRows),
    table,
  });
  const database = () => {
    throw new Error("Unexpected direct query.");
  };
  database.transaction = async (callback) => callback(transaction);
  const model = createReportGradesModel(database);

  await model.replacePanel("kunjungan", [
    { threshold: 95, message: "Sangat baik" },
    { threshold: 80, message: "Baik" },
  ]);

  assert.deepEqual(rows, [
    { panel: "omset", threshold: 90, message: "Omset tetap" },
    { panel: "kunjungan", threshold: 95, message: "Sangat baik" },
    { panel: "kunjungan", threshold: 80, message: "Baik" },
  ]);
});
