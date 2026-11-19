import assert from "node:assert/strict";
import { test } from "node:test";
import { createTargetSalesService } from "./target-sales.service.js";

const createModel = () => ({
  list: async (filters) => filters,
  summarize: async (filters) => filters,
  summarizeByEmployee: async (filters) => filters,
  summarizeByPeriod: async (filters) => filters,
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

test("Manager summary can group results by employee", async () => {
  let receivedFilters;
  const model = {
    ...createModel(),
    summarizeByEmployee: async (filters) => {
      receivedFilters = filters;
      return {
        total: 100,
        achieved: 65,
        employees: 2,
        groups: [
          {
            id_karyawan: 12,
            nama_karyawan: "A",
            total: 60,
            achieved: 40,
            remaining: 20,
          },
        ],
      };
    },
  };
  const service = createTargetSalesService(model, { isVisitTarget: false });
  const result = await service.summary({
    from: "2026-11-01",
    to: "2026-11-30",
    group_by: "karyawan",
    user: { peran: "head-sales" },
  });

  assert.deepEqual(receivedFilters, {
    from: "2026-11-01",
    to: "2026-11-30",
    idKaryawan: null,
  });
  assert.equal(result.remaining, 35);
  assert.equal(result.groups[0].nama_karyawan, "A");
});

test("Manager summary can group independently by employee and period", async () => {
  let receivedFilters;
  const model = {
    ...createModel(),
    summarizeByEmployee: async (filters) => {
      receivedFilters = filters;
      return {
        total: 100,
        achieved: 65,
        groups: [
          {
            id_karyawan: 12,
            nama_karyawan: "A",
            period_start: "2026-11-02",
            period_end: "2026-11-08",
            total: 60,
            achieved: 40,
            remaining: 20,
          },
        ],
      };
    },
  };
  const service = createTargetSalesService(model, { isVisitTarget: false });
  const result = await service.summary({
    from: "2026-11-01",
    to: "2026-11-30",
    group_by: "karyawan",
    group_period: "week",
    user: { peran: "head-sales" },
  });

  assert.deepEqual(receivedFilters, {
    from: "2026-11-01",
    to: "2026-11-30",
    idKaryawan: null,
    groupPeriod: "week",
  });
  assert.equal(result.groups[0].nama_karyawan, "A");
  assert.equal(result.groups[0].period_start, "2026-11-02");
});

for (const groupBy of ["week", "month"]) {
  test(`Manager summary can group results by ${groupBy}`, async () => {
    let receivedFilters;
    const model = {
      ...createModel(),
      summarizeByPeriod: async (filters) => {
        receivedFilters = filters;
        return {
          total: 100,
          achieved: 65,
          groups: [{ period_start: "2026-11-01" }],
        };
      },
    };
    const service = createTargetSalesService(model, { isVisitTarget: false });
    const result = await service.summary({
      from: "2026-11-01",
      to: "2026-11-30",
      group_by: groupBy,
      user: { peran: "head-sales" },
    });

    assert.equal(receivedFilters.groupBy, groupBy);
    assert.equal(result.groups[0].period_start, "2026-11-01");
  });
}

test("Manager summary accepts the independent period grouping parameter", async () => {
  let receivedFilters;
  const model = {
    ...createModel(),
    summarizeByPeriod: async (filters) => {
      receivedFilters = filters;
      return { total: 100, achieved: 65, groups: [] };
    },
  };
  const service = createTargetSalesService(model, { isVisitTarget: false });
  await service.summary({
    group_period: "month",
    user: { peran: "head-sales" },
  });

  assert.equal(receivedFilters.groupBy, "month");
});

test("Summary rejects unsupported grouping values", async () => {
  const service = createTargetSalesService(createModel(), {
    isVisitTarget: false,
  });

  await assert.rejects(
    service.summary({
      group_by: "department",
      user: { peran: "owner" },
    }),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.summary({
      group_period: "year",
      user: { peran: "owner" },
    }),
    { statusCode: 400 },
  );
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
