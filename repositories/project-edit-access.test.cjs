const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertProjectDetailEditor,
  isProjectDetailUpdate,
  shouldAssertStatusResetApproval,
} = require("./project-edit-access.cjs");

test("assigned salesperson can edit project details", () => {
  assert.doesNotThrow(() =>
    assertProjectDetailEditor(
      { id_karyawan: 42 },
      { id_karyawan: 42, rank: 50 },
    ),
  );
});

test("high-role user can edit project details for another salesperson", () => {
  assert.doesNotThrow(() =>
    assertProjectDetailEditor(
      { id_karyawan: 42 },
      { id_karyawan: 7, rank: 20 },
    ),
  );
});

test("unassigned project can be edited by an authenticated user", () => {
  assert.doesNotThrow(() =>
    assertProjectDetailEditor(
      { id_karyawan: null },
      { id_karyawan: 7, rank: 50 },
    ),
  );
});

test("other salesperson cannot edit project details", () => {
  assert.throws(
    () =>
      assertProjectDetailEditor(
        { id_karyawan: 42 },
        { id_karyawan: 7, rank: 50 },
      ),
    { statusCode: 403 },
  );
});

test("project detail updates exclude KOP-only and status-only updates", () => {
  assert.equal(
    isProjectDetailUpdate({ fields: ["sembunyikankop=?"] }),
    false,
  );
  assert.equal(isProjectDetailUpdate({ fields: [] }), false);
  assert.equal(
    isProjectDetailUpdate({ fields: ["klien=?"] }),
    true,
  );
});

test("detail updates bypass approval lock while status-only reset keeps it", () => {
  assert.equal(
    shouldAssertStatusResetApproval({
      id_statusproyek: 1,
      isDetailUpdate: true,
    }),
    false,
  );
  assert.equal(
    shouldAssertStatusResetApproval({
      id_statusproyek: 1,
      isDetailUpdate: false,
    }),
    true,
  );
  assert.equal(
    shouldAssertStatusResetApproval({
      id_statusproyek: 2,
      isDetailUpdate: false,
    }),
    false,
  );
});
