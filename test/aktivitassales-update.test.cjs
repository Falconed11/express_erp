const test = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../repositories/db.2.0.0.cjs");
const { update } = require("../repositories/aktivitassales.cjs");

const withPoolExecute = async (execute, run) => {
  const originalExecute = pool.execute;
  pool.execute = execute;
  try {
    await run();
  } finally {
    pool.execute = originalExecute;
  }
};

const withNow = async (timestamp, run) => {
  const originalNow = Date.now;
  Date.now = () => timestamp;
  try {
    await run();
  } finally {
    Date.now = originalNow;
  }
};

test("completion edits are rejected before 16:00 WIB on the visit date", async () => {
  const editFrom = Date.parse("2026-11-24T09:00:00.000Z");
  let updateCalled = false;

  await withPoolExecute(
    async (sql) => {
      if (sql.includes("DATE_FORMAT(tanggal")) {
        return [[{ tanggal: "2026-11-24", tanggalselesai: null }]];
      }
      if (sql.startsWith("UPDATE")) updateCalled = true;
      return [{ affectedRows: 1 }];
    },
    async () =>
      withNow(editFrom - 1, async () => {
        await assert.rejects(
          update({
            id: 1,
            isSelesai: true,
            pic: "PIC",
            jabatan: "Manager",
            kontak: "08123456789",
            keterangan_hasil: "Selesai",
            tanggalselesai: "2026-11-24T16:30",
          }),
          /mulai pukul 16\.00 WIB/,
        );
      }),
  );

  assert.equal(updateCalled, false);
});

test("completion edits remain unavailable before a future visit's cutoff", async () => {
  const beforeVisitCutoff = Date.parse("2026-11-24T10:00:00.000Z");

  await withPoolExecute(
    async (sql) => {
      if (sql.includes("DATE_FORMAT(tanggal")) {
        return [[{ tanggal: "2026-11-25", tanggalselesai: null }]];
      }
      return [{ affectedRows: 1 }];
    },
    async () =>
      withNow(beforeVisitCutoff, async () => {
        await assert.rejects(
          update({
            id: 1,
            isSelesai: true,
            pic: "PIC",
            jabatan: "Manager",
            kontak: "08123456789",
            keterangan_hasil: "Selesai",
            tanggalselesai: "2026-11-25T16:30",
          }),
          /mulai pukul 16\.00 WIB/,
        );
      }),
  );
});

test("completed visits require PIC, Jabatan, Kontak, and Keterangan Hasil", async () => {
  await assert.rejects(
    update({
      id: 1,
      isSelesai: true,
      pic: "PIC",
      jabatan: "Manager",
      kontak: "08123456789",
      keterangan_hasil: "",
    }),
    /Keterangan Hasil wajib diisi/,
  );
});

test("completion edits accept result notes starting at 16:00 WIB", async () => {
  const editFrom = Date.parse("2026-11-24T09:00:00.000Z");
  let updateStatement;

  await withPoolExecute(
    async (sql, values) => {
      if (sql.includes("DATE_FORMAT(tanggal")) {
        return [[{ tanggal: "2026-11-24", tanggalselesai: null }]];
      }
      if (sql.startsWith("UPDATE")) updateStatement = { sql, values };
      return [{ affectedRows: 1 }];
    },
    async () =>
      withNow(editFrom, async () => {
        await update({
          id: 1,
          isSelesai: true,
          pic: "PIC",
          jabatan: "Manager",
          kontak: "08123456789",
          keterangan_hasil: "Kunjungan selesai",
          tanggalselesai: "2026-11-25T17:45",
        });
      }),
  );

  assert.match(updateStatement.sql, /keterangan_hasil=\?/);
  assert.ok(updateStatement.values.includes("Kunjungan selesai"));
  assert.ok(updateStatement.values.includes("2026-11-25 17:45:00"));
});

test("completion date cannot be before the scheduled visit", async () => {
  const editFrom = Date.parse("2026-11-24T09:00:00.000Z");

  await withPoolExecute(
    async (sql) => {
      if (sql.includes("DATE_FORMAT(tanggal")) {
        return [[{ tanggal: "2026-11-24", tanggalselesai: null }]];
      }
      return [{ affectedRows: 1 }];
    },
    async () =>
      withNow(editFrom, async () => {
        await assert.rejects(
          update({
            id: 1,
            isSelesai: true,
            pic: "PIC",
            jabatan: "Manager",
            kontak: "08123456789",
            keterangan_hasil: "Kunjungan selesai",
            tanggalselesai: "2026-11-23T17:45",
          }),
          /sama dengan atau setelah tanggal rencana kunjungan/,
        );
      }),
  );
});

test("activity detail edits are limited to creation day unless the user is super", async () => {
  let updateCalled = false;

  await withPoolExecute(
    async (sql) => {
      if (sql.includes("DATE(created_at)")) return [[{ created_today: 0 }]];
      if (sql.startsWith("UPDATE")) {
        updateCalled = true;
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 1 }];
    },
    async () => {
      await assert.rejects(
        update({ id: 1, catatan: "Updated" }),
        /hari pembuatan data atau oleh super/,
      );
      await update({ id: 1, catatan: "Updated", isSuper: true });
    },
  );

  assert.equal(updateCalled, true);
});
