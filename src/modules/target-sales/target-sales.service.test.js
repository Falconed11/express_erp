import assert from "node:assert/strict";
import { test } from "node:test";
import { createTargetSalesService } from "./target-sales.service.js";

const createModel = () => ({
  list: async (filters) => filters,
  summarize: async (filters) => filters,
  createMany: async (data) => data,
  deleteMany: async (ids) => ids,
});

test("Sales summary is restricted to the signed-in employee", async () => {
  const service = createTargetSalesService(createModel(), {
    isVisitTarget: false,
  });
  const result = await service.summary({
    from: "2026-11-01",
    to: "2026-11-30",
    id_karyawan: "13",
    user: { peran: "sales", id_karyawan: 12 },
  });

  assert.equal(result.idKaryawan, 12);
});

test("Summary includes achieved and remaining values", async () => {
  const model = {
    ...createModel(),
    summarize: async () => ({ total: 100, achieved: 65, employees: 1 }),
  };
  const service = createTargetSalesService(model, { isVisitTarget: false });
  const result = await service.summary({
    user: { peran: "owner" },
  });

  assert.equal(result.total, 100);
  assert.equal(result.achieved, 65);
  assert.equal(result.remaining, 35);
});

test("Remaining is zero after exceeding the target", async () => {
  const model = {
    ...createModel(),
    summarize: async () => ({ total: 100, achieved: 125, employees: 1 }),
  };
  const service = createTargetSalesService(model, { isVisitTarget: true });
  const result = await service.summary({
    user: { peran: "owner" },
  });

  assert.equal(result.remaining, 0);
});

test("Manager summary follows an optional employee and date filter", async () => {
  const service = createTargetSalesService(createModel(), {
    isVisitTarget: false,
  });
  const result = await service.summary({
    from: "2026-11-01",
    id_karyawan: "15",
    user: { peran: "head-sales" },
  });

  assert.equal(result.from, "2026-11-01");
  assert.equal(result.to, null);
  assert.equal(result.idKaryawan, 15);
});

test("Managers can add one shared target for multiple employees", async () => {
  const service = createTargetSalesService(createModel(), {
    isVisitTarget: true,
  });
  const result = await service.create(
    {
      tanggal: "2026-11-17",
      jumlah: 5,
      id_karyawan: [12, 13],
    },
    { peran: "head-sales", id_karyawan: 4 },
  );

  assert.deepEqual(result.employeeIds, [12, 13]);
  assert.equal(result.jumlah, 5);
});

test("Managers can delete multiple selected rows", async () => {
  const service = createTargetSalesService(createModel(), {
    isVisitTarget: false,
  });
  const result = await service.deleteMany(
    { ids: [21, 22, 21] },
    { peran: "owner" },
  );

  assert.deepEqual(result, [21, 22]);
});

test("Sales cannot create targets and visit targets must be whole numbers", async () => {
  const service = createTargetSalesService(createModel(), {
    isVisitTarget: true,
  });

  await assert.rejects(
    service.create(
      { tanggal: "2026-11-17", jumlah: 2, id_karyawan: [12] },
      { peran: "sales", id_karyawan: 12 },
    ),
    { statusCode: 403 },
  );
  await assert.rejects(
    service.create(
      { tanggal: "2026-11-17", jumlah: 1.5, id_karyawan: [12] },
      { peran: "owner", id_karyawan: 4 },
    ),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.deleteMany(
      { ids: [21] },
      { peran: "sales", id_karyawan: 12 },
    ),
    { statusCode: 403 },
  );
});

test("Invalid calendar dates are rejected", async () => {
  const service = createTargetSalesService(createModel(), {
    isVisitTarget: false,
  });

  await assert.rejects(
    service.summary({
      from: "2026-02-30",
      to: "2026-03-01",
      user: { peran: "owner" },
    }),
    { statusCode: 400 },
  );
});
