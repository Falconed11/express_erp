import assert from "node:assert/strict";
import { test } from "node:test";
import { createReportGradesService } from "./report-grades.service.js";

const manager = { peran: "owner", rank: 20 };
const viewer = { peran: "sales", rank: 30 };

const createModel = () => {
  let rows = [];
  return {
    async listAll() {
      return rows;
    },
    async replacePanel(panel, grades) {
      rows = rows.filter((row) => row.panel !== panel);
      rows.push(...grades.map((grade) => ({ panel, ...grade })));
    },
  };
};

test("lists globally shared grades in the correct direction with letter grades", async () => {
  const model = createModel();
  await model.replacePanel("project-status", [
    { threshold: 50, message: "Perlu ditingkatkan" },
    { threshold: 80, message: "Bagus" },
  ]);
  await model.replacePanel("durasi-proyek", [
    { threshold: 60, message: "Lambat" },
    { threshold: 30, message: "Cepat" },
  ]);
  const service = createReportGradesService(model);

  const result = await service.list(viewer);

  assert.deepEqual(result["project-status"], [
    { threshold: 80, message: "Bagus", grade: "A" },
    { threshold: 50, message: "Perlu ditingkatkan", grade: "B" },
  ]);
  assert.deepEqual(result["durasi-proyek"], [
    { threshold: 30, message: "Cepat", grade: "A" },
    { threshold: 60, message: "Lambat", grade: "B" },
  ]);
  assert.deepEqual(result.kunjungan, []);
});

test("requires a high rank to replace grade configuration", async () => {
  const service = createReportGradesService(createModel());

  await assert.rejects(
    service.replacePanel("kunjungan", [], viewer),
    { statusCode: 403 },
  );
  const result = await service.replacePanel(
    "kunjungan",
    [{ threshold: 90, message: "Tercapai" }],
    manager,
  );
  assert.deepEqual(result.kunjungan, [
    { threshold: 90, message: "Tercapai", grade: "A" },
  ]);
});

test("rejects duplicated thresholds and invalid panel keys", async () => {
  const service = createReportGradesService(createModel());

  await assert.rejects(
    service.replacePanel(
      "omset",
      [
        { threshold: 80, message: "A" },
        { threshold: 80, message: "B" },
      ],
      manager,
    ),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.replacePanel("unknown", [], manager),
    { statusCode: 400 },
  );
});

test("accepts a grade without a custom message", async () => {
  const service = createReportGradesService(createModel());

  const result = await service.replacePanel(
    "kunjungan",
    [{ threshold: 90 }],
    manager,
  );

  assert.deepEqual(result.kunjungan, [
    { threshold: 90, message: "", grade: "A" },
  ]);
  await assert.rejects(
    service.replacePanel(
      "kunjungan",
      [{ threshold: 95, message: "x".repeat(501) }],
      manager,
    ),
    { statusCode: 400 },
  );
});
