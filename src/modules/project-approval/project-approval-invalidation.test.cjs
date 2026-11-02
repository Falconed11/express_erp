const test = require("node:test");
const assert = require("node:assert/strict");
const {
  invalidateApproval,
  invalidateProjectApprovals,
  invalidateProductApprovals,
} = require("./project-approval-invalidation.cjs");

const createConnection = (versions = [], approvals = []) => {
  const statements = [];
  return {
    statements,
    execute: async (sql, values) => {
      statements.push({ sql, values });
      if (sql.startsWith("SELECT DISTINCT")) return [versions];
      if (sql.includes("FROM proyek_penawaran_approval")) return [approvals];
      return [{ affectedRows: 1 }];
    },
  };
};

test("invalidateApproval checks the lock and only resets an unapproved version", async () => {
  const connection = createConnection();

  await invalidateApproval(connection, 12, 3, 8);

  assert.equal(connection.statements.length, 2);
  assert.match(connection.statements[0].sql, /approved_level IS NOT NULL/);
  assert.deepEqual(connection.statements[0].values, [12, 3]);
  assert.match(connection.statements[1].sql, /id_proyek = \? AND versi = \?/);
  assert.match(connection.statements[1].sql, /approved_level IS NULL/);
  assert.deepEqual(connection.statements[1].values, [8, 12, 3]);
});

test("invalidateProjectApprovals locks approved offers and resets only unapproved rows", async () => {
  const connection = createConnection();

  await invalidateProjectApprovals(connection, 12, 8);

  assert.equal(connection.statements.length, 2);
  assert.match(connection.statements[0].sql, /approved_level IS NOT NULL/);
  assert.deepEqual(connection.statements[0].values, [12]);
  assert.match(
    connection.statements[1].sql,
    /WHERE id_proyek = \? AND aktif = 1/,
  );
  assert.match(connection.statements[1].sql, /approved_level IS NULL/);
  assert.deepEqual(connection.statements[1].values, [8, 12]);
});

test("product changes do not clear existing approvals", async () => {
  const connection = createConnection([
    { id_proyek: 12, versi: 1 },
    { id_proyek: 12, versi: 2 },
  ]);

  await invalidateProductApprovals(connection, 44, 8);

  assert.equal(connection.statements.length, 3);
  assert.deepEqual(connection.statements[0].values, [44]);
  assert.match(connection.statements[1].sql, /approved_level IS NULL/);
  assert.match(connection.statements[2].sql, /approved_level IS NULL/);
});

test("invalidateApproval refuses changes to an approved offer", async () => {
  const connection = createConnection([], [{ id: 1 }]);

  await assert.rejects(
    invalidateApproval(connection, 12, 3),
    /Penawaran sudah disetujui dan terkunci/,
  );
  assert.equal(connection.statements.length, 1);
});
