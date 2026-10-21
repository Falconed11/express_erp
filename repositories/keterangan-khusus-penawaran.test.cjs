const test = require("node:test");
const assert = require("node:assert/strict");
const { copyForVersion } = require("./keterangan-khusus-penawaran.cjs");

const createConnection = ({ existing = false, copied = 0 } = {}) => {
  const statements = [];
  return {
    statements,
    execute: async (sql, values) => {
      statements.push({ sql, values });
      if (sql.startsWith("SELECT id")) {
        return [existing ? [{ id: 1 }] : []];
      }
      return [{ affectedRows: copied }];
    },
  };
};

test("copies active notes to the requested new version", async () => {
  const connection = createConnection({ copied: 2 });

  const result = await copyForVersion(connection, 7, 2, 3);

  assert.equal(result.affectedRows, 2);
  assert.equal(connection.statements.length, 2);
  assert.deepEqual(connection.statements[1].values, [3, 7, 2]);
  assert.match(connection.statements[1].sql, /versi = \? AND aktif = 1/);
});

test("does not duplicate notes already copied into the target version", async () => {
  const connection = createConnection({ existing: true });

  const result = await copyForVersion(connection, 7, 2, 3);

  assert.equal(result.affectedRows, 0);
  assert.equal(connection.statements.length, 1);
});

test("leaves an empty target when the source version has no active notes", async () => {
  const connection = createConnection({ copied: 0 });

  const result = await copyForVersion(connection, 7, 2, 3);

  assert.equal(result.affectedRows, 0);
  assert.equal(connection.statements.length, 2);
});
