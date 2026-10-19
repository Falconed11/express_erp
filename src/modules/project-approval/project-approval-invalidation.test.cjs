const test = require("node:test");
const assert = require("node:assert/strict");
const {
  invalidateApproval,
  invalidateProjectApprovals,
  invalidateProductApprovals,
} = require("./project-approval-invalidation.cjs");

const createConnection = (versions = []) => {
  const statements = [];
  return {
    statements,
    execute: async (sql, values) => {
      statements.push({ sql, values });
      return sql.startsWith("SELECT DISTINCT")
        ? [versions]
        : [{ affectedRows: 1 }];
    },
  };
};

test("invalidateApproval resets one offer version", async () => {
  const connection = createConnection();

  await invalidateApproval(connection, 12, 3, 8);

  assert.equal(connection.statements.length, 1);
  assert.match(connection.statements[0].sql, /id_proyek = \? AND versi = \?/);
  assert.deepEqual(connection.statements[0].values, [8, 12, 3]);
});

test("invalidateProjectApprovals resets all versions for one project", async () => {
  const connection = createConnection();

  await invalidateProjectApprovals(connection, 12, 8);

  assert.equal(connection.statements.length, 1);
  assert.match(
    connection.statements[0].sql,
    /WHERE id_proyek = \? AND aktif = 1/,
  );
  assert.deepEqual(connection.statements[0].values, [8, 12]);
});

test("invalidateProductApprovals resets each project version using the product", async () => {
  const connection = createConnection([
    { id_proyek: 12, versi: 1 },
    { id_proyek: 12, versi: 2 },
  ]);

  await invalidateProductApprovals(connection, 44, 8);

  assert.equal(connection.statements.length, 3);
  assert.deepEqual(connection.statements[0].values, [44]);
  assert.deepEqual(connection.statements[1].values, [8, 12, 1]);
  assert.deepEqual(connection.statements[2].values, [8, 12, 2]);
});
