const assert = require("node:assert/strict");
const test = require("node:test");
const {
  expandReplacementComponents,
  normalizeReplacementSelections,
  replace,
} = require("./keranjangproyek-composite.cjs");

const selections = [
  { type: "composite", id: 7 },
  { type: "item", id: 13 },
];

const createTransactionPool = ({
  compositeRows = [
    {
      id: 7,
      id_proyek: 42,
      versi: 3,
      instalasi: 0,
      id_subproyek: 4,
      jumlah: 2,
      sort_order: 0,
    },
  ],
  projectEmployee = 2,
  failOnComponentInsert = false,
} = {}) => {
  const statements = [];
  let committed = false;
  let rolledBack = false;
  const connection = {
    async beginTransaction() {},
    async commit() {
      committed = true;
    },
    async rollback() {
      rolledBack = true;
    },
    release() {},
    async execute(sql, values = []) {
      const query = sql.replace(/\s+/g, " ").trim();
      statements.push({ query, values });
      if (query.startsWith("SELECT proyek.id_karyawan")) {
        return [[{ id_karyawan: projectEmployee, progress: 20 }]];
      }
      if (query.startsWith("SELECT id FROM proyek_penawaran_approval")) {
        return [[]];
      }
      if (query.startsWith("SELECT id FROM subproyek")) {
        return [[{ id: 4 }]];
      }
      if (
        query.startsWith("SELECT id, id_proyek, versi, instalasi, id_subproyek, jumlah") &&
        query.includes("FROM keranjangproyek_composite")
      ) {
        return [compositeRows];
      }
      if (
        query.startsWith("SELECT id, id_proyek, versi, instalasi, id_subproyek, jumlah") &&
        query.includes("FROM keranjangproyek WHERE")
      ) {
        return [[
          {
            id: 13,
            id_proyek: 42,
            versi: 3,
            instalasi: 0,
            id_subproyek: 4,
            jumlah: 5,
            sort_order: 1,
          },
        ]];
      }
      if (query.startsWith("SELECT id_keranjangproyek FROM keranjangproyek_composite_item")) {
        return [[]];
      }
      if (query.startsWith("SELECT ci.id_composite")) {
        return [[
          {
            id_composite: 7,
            id_keranjangproyek: 11,
            id_proyek: 42,
            versi: 3,
            instalasi: 0,
            jumlah: 3,
            id_subproyek: 2,
          },
          {
            id_composite: 7,
            id_keranjangproyek: 12,
            id_proyek: 42,
            versi: 3,
            instalasi: 0,
            jumlah: 2,
            id_subproyek: 2,
          },
        ]];
      }
      if (query.startsWith("SELECT entity_type, entity_id, sort_order FROM")) {
        return [[
          { entity_type: "composite", entity_id: 7, sort_order: 0 },
          { entity_type: "item", entity_id: 13, sort_order: 1 },
        ]];
      }
      if (query.startsWith("SELECT id, diskon, diskoninstalasi")) {
        return [[]];
      }
      if (query.startsWith("INSERT INTO keranjangproyek_composite ")) {
        return [{ insertId: 99 }];
      }
      if (
        failOnComponentInsert &&
        query.startsWith("INSERT INTO keranjangproyek_composite_item")
      ) {
        throw new Error("Simulated component-link failure.");
      }
      return [{ affectedRows: 1 }];
    },
  };
  return {
    statements,
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
    async getConnection() {
      return connection;
    },
  };
};

test("replacement selection validation requires unique rows and a group", () => {
  assert.deepEqual(normalizeReplacementSelections(selections), selections);
  assert.throws(
    () =>
      normalizeReplacementSelections([
        { type: "composite", id: 7 },
        { type: "composite", id: 7 },
      ]),
    /tidak boleh berulang/,
  );
  assert.throws(
    () => normalizeReplacementSelections([
      { type: "item", id: 11 },
      { type: "item", id: 12 },
    ]),
    /gabungan yang akan digantikan/,
  );
});

test("replacement expansion scales old components and preserves standalone quantities", () => {
  const expanded = expandReplacementComponents(
    selections,
    [{ id: 7, jumlah: 2 }],
    [{ id: 13, jumlah: 5, id_subproyek: 4 }],
    [
      { id_composite: 7, id_keranjangproyek: 11, jumlah: 3, id_subproyek: 2 },
      { id_composite: 7, id_keranjangproyek: 12, jumlah: 2, id_subproyek: 2 },
    ],
  );

  assert.deepEqual(
    expanded.map(({ id_keranjangproyek, jumlah }) => ({
      id_keranjangproyek,
      jumlah,
    })),
    [
      { id_keranjangproyek: 11, jumlah: 6 },
      { id_keranjangproyek: 12, jumlah: 4 },
      { id_keranjangproyek: 13, jumlah: 5 },
    ],
  );
});

test("replacement expansion keeps fractional quantities for decimal storage", () => {
  const expanded = expandReplacementComponents(
    [{ type: "composite", id: 8 }, { type: "item", id: 13 }],
    [{ id: 8, jumlah: 0.5 }],
    [{ id: 13, jumlah: 5, id_subproyek: 4 }],
    [
      { id_composite: 8, id_keranjangproyek: 11, jumlah: 3, id_subproyek: 2 },
    ],
  );

  assert.equal(expanded[0].jumlah, 1.5);
  assert.equal(expanded[1].jumlah, 5);
});

test("quantity migration rollback refuses fractional data", async () => {
  const { up: applyQuantityMigration, down: rollbackQuantityMigration } = await import(
    "../migrations/20261106150000_allow_decimal_keranjangproyek_quantity.js"
  );
  let migration;
  const upKnex = {
    schema: {
      async alterTable(tableName, callback) {
        assert.equal(tableName, "keranjangproyek");
        callback({
          decimal(column, precision, scale) {
            migration = { column, precision, scale };
            return {
              notNullable() {
                return { alter() {} };
              },
            };
          },
        });
      },
    },
  };
  await applyQuantityMigration(upKnex);
  assert.deepEqual(migration, {
    column: "jumlah",
    precision: 15,
    scale: 3,
  });

  const builder = {
    select() {
      return this;
    },
    whereRaw(condition) {
      assert.match(condition, /FLOOR\(jumlah\)/);
      assert.match(condition, /2147483647/);
      return this;
    },
    async first() {
      return { id: 14 };
    },
  };
  const knex = () => builder;
  knex.schema = {
    alterTable() {
      assert.fail("Integer rollback must not run when data would be truncated.");
    },
  };

  await assert.rejects(
    rollbackQuantityMigration(knex),
    /Cannot restore integer product quantities/,
  );
});

test("replacement commits all old groups, quantities, and new links atomically", async () => {
  const transactionPool = createTransactionPool();
  const result = await replace(
    {
      id_proyek: 42,
      versi: 3,
      instalasi: 0,
      id_subproyek: 4,
      nama: "Gabungan baru",
      jumlah: 1,
      satuan: "set",
      selections,
      user: { id_karyawan: 2, rank: 20 },
      updated_by: 2,
    },
    transactionPool,
  );

  assert.deepEqual(result, { insertId: 99 });
  assert.equal(transactionPool.committed, true);
  assert.equal(transactionPool.rolledBack, false);
  assert.deepEqual(
    transactionPool.statements
      .filter(({ query }) => query.startsWith("UPDATE keranjangproyek SET jumlah"))
      .map(({ values }) => [values[0], values[2]]),
    [
      [6, 11],
      [4, 12],
      [5, 13],
    ],
  );
  assert.deepEqual(
    transactionPool.statements
      .filter(({ query }) =>
        query.startsWith("INSERT INTO keranjangproyek_composite_item"),
      )
      .map(({ values }) => values.slice(1)),
    [
      [11, 0],
      [12, 1],
      [13, 2],
    ],
  );
});

test("replacement rolls back when selected groups are outside the requested scope", async () => {
  const transactionPool = createTransactionPool({
    compositeRows: [
      {
        id: 7,
        id_proyek: 99,
        versi: 3,
        instalasi: 0,
        id_subproyek: 4,
        jumlah: 2,
        sort_order: 0,
      },
    ],
  });

  await assert.rejects(
    replace(
      {
        id_proyek: 42,
        versi: 3,
        instalasi: 0,
        id_subproyek: 4,
        nama: "Gabungan baru",
        jumlah: 1,
        satuan: "set",
        selections,
        user: { id_karyawan: 2, rank: 20 },
        updated_by: 2,
      },
      transactionPool,
    ),
    /Transaction rolled back/,
  );
  assert.equal(transactionPool.committed, false);
  assert.equal(transactionPool.rolledBack, true);
  assert.equal(
    transactionPool.statements.some(({ query }) =>
      /^(DELETE FROM|INSERT INTO keranjangproyek_composite|UPDATE keranjangproyek SET jumlah)/.test(
        query,
      ),
    ),
    false,
  );
});

test("replacement rolls back when the user cannot edit the project", async () => {
  const transactionPool = createTransactionPool({ projectEmployee: 3 });

  await assert.rejects(
    replace(
      {
        id_proyek: 42,
        versi: 3,
        instalasi: 0,
        id_subproyek: 4,
        nama: "Gabungan baru",
        jumlah: 1,
        satuan: "set",
        selections,
        user: { id_karyawan: 2, rank: 30 },
        updated_by: 2,
      },
      transactionPool,
    ),
    /Transaction rolled back/,
  );
  assert.equal(transactionPool.committed, false);
  assert.equal(transactionPool.rolledBack, true);
  assert.equal(
    transactionPool.statements.some(({ query }) =>
      /^(DELETE FROM|INSERT INTO keranjangproyek_composite|UPDATE keranjangproyek SET jumlah)/.test(
        query,
      ),
    ),
    false,
  );
});

test("replacement rolls back partial writes if linking the new group fails", async () => {
  const transactionPool = createTransactionPool({
    failOnComponentInsert: true,
  });

  await assert.rejects(
    replace(
      {
        id_proyek: 42,
        versi: 3,
        instalasi: 0,
        id_subproyek: 4,
        nama: "Gabungan baru",
        jumlah: 1,
        satuan: "set",
        selections,
        user: { id_karyawan: 2, rank: 20 },
        updated_by: 2,
      },
      transactionPool,
    ),
    /Transaction rolled back/,
  );
  assert.equal(transactionPool.committed, false);
  assert.equal(transactionPool.rolledBack, true);
  assert.equal(
    transactionPool.statements.some(({ query }) =>
      query.startsWith("UPDATE keranjangproyek SET jumlah"),
    ),
    true,
  );
});
