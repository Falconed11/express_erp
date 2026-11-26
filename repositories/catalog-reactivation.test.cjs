const test = require("node:test");
const assert = require("node:assert/strict");
const kategoriproduk = require("./kategoriproduk.cjs");
const merek = require("./merek.cjs");

const catalogs = [
  { label: "kategori", table: "kategoriproduk", repository: kategoriproduk },
  { label: "merek", table: "merek", repository: merek },
];

for (const { label, table, repository } of catalogs) {
  test(`reactivates a matching inactive ${label}`, async () => {
    const calls = [];
    const conn = {
      async execute(sql, values) {
        calls.push({ sql, values });
        if (sql.startsWith("SELECT")) return [[{ id: 8 }], []];
        return [{ affectedRows: 1 }, []];
      },
    };

    const id = await repository.create({
      nama: "Restored entry",
      conn,
      allowReactivate: true,
    });

    assert.equal(id, 8);
    assert.deepEqual(calls, [
      {
        sql: `SELECT id FROM ${table} WHERE nama = ? AND aktif = 0 LIMIT 1`,
        values: ["Restored entry"],
      },
      {
        sql: `UPDATE ${table} SET aktif = 1 WHERE id = ?`,
        values: [8],
      },
    ]);
  });

  test(`requires permission to reactivate an inactive ${label}`, async () => {
    const calls = [];
    const conn = {
      async execute(sql, values) {
        calls.push({ sql, values });
        return [[{ id: 8 }], []];
      },
    };

    await assert.rejects(
      repository.create({ nama: "Restored entry", conn }),
      (error) =>
        error.statusCode === 403 &&
        error.message.includes("Hanya owner atau super"),
    );
    assert.equal(calls.length, 1);
  });

  test(`creates a new ${label} when no inactive match exists`, async () => {
    const calls = [];
    const conn = {
      async execute(sql, values) {
        calls.push({ sql, values });
        if (sql.startsWith("SELECT")) return [[], []];
        return [{ insertId: 12 }, []];
      },
    };

    const id = await repository.create({ nama: "New entry", conn });

    assert.equal(id, 12);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].sql, `insert into ${table} (nama) values (?)`);
    assert.deepEqual(calls[1].values, ["New entry"]);
  });
}
