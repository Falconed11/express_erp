const test = require("node:test");
const assert = require("node:assert/strict");
const { createPurchaseJournal } = require("./produkmasuk-jurnal.cjs");

const createConnection = (creditCoa) => {
  const calls = [];
  return {
    calls,
    async execute(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes("FROM jurnal_form")) return [[{ id: 5 }], []];
      if (sql.includes("FROM coa_type ct")) return [[{ id: 10 }], []];
      if (sql.includes("FROM coa c") && sql.includes("EXISTS")) {
        return [creditCoa ? [creditCoa] : [], []];
      }
      if (sql.includes("INSERT INTO jurnal")) return [{ insertId: 100 }, []];
      if (sql.includes("INSERT INTO transaksi")) {
        return [{ affectedRows: 2 }, []];
      }
      if (sql.includes("INSERT INTO produkmasuk_pembayaran")) {
        return [{ insertId: 1 }, []];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
};

const purchaseInput = {
  id_produkmasuk: 45,
  id_perusahaan: 2,
  id_coa_kredit: 22,
  tanggal: "2026-10-09",
  amount: 50,
  created_by: 7,
};

test("paid purchase creates a balanced journal and stock-payment link", async () => {
  const conn = createConnection({
    id: 22,
    coa_subtype: "Bank",
    coa_type: "Aktiva Lancar",
  });

  const journalId = await createPurchaseJournal(conn, {
    ...purchaseInput,
    lunas: true,
  });

  assert.equal(journalId, 100);
  const journalInsert = conn.calls.find(({ sql }) =>
    sql.includes("INSERT INTO jurnal"),
  );
  assert.equal(journalInsert.values[0], 5);
  const transactionInsert = conn.calls.find(({ sql }) =>
    sql.includes("INSERT INTO transaksi"),
  );
  assert.deepEqual(
    transactionInsert.values,
    [100, 10, 50, 7, 7, 100, 22, 50, 7, 7],
  );
  const paymentLink = conn.calls.find(({ sql }) =>
    sql.includes("INSERT INTO produkmasuk_pembayaran"),
  );
  assert.deepEqual(paymentLink.values, [45, 100, 7, 7]);
});

test("debt purchase accepts a credit account under Kewajiban Lancar", async () => {
  const conn = createConnection({
    id: 22,
    coa_subtype: "Hutang",
    coa_type: "Kewajiban Lancar",
  });

  const journalId = await createPurchaseJournal(conn, {
    ...purchaseInput,
    lunas: false,
  });

  assert.equal(journalId, 100);
  assert.ok(conn.calls.some(({ sql }) => sql.includes("INSERT INTO jurnal")));
});

test("paid purchases reject a Hutang credit account", async () => {
  const conn = createConnection({
    id: 22,
    coa_subtype: "Hutang",
    coa_type: "Kewajiban Lancar",
  });

  await assert.rejects(
    createPurchaseJournal(conn, { ...purchaseInput, lunas: true }),
    /tidak dapat dipilih/,
  );
  assert.equal(
    conn.calls.some(({ sql }) => sql.includes("INSERT INTO jurnal")),
    false,
  );
});

test("debt purchases reject a non-liability credit account", async () => {
  const conn = createConnection({
    id: 22,
    coa_subtype: "Bank",
    coa_type: "Aktiva Lancar",
  });

  await assert.rejects(
    createPurchaseJournal(conn, { ...purchaseInput, lunas: false }),
    /harus menggunakan akun Hutang/,
  );
  assert.equal(
    conn.calls.some(({ sql }) => sql.includes("INSERT INTO jurnal")),
    false,
  );
});
