import currency from "currency.js";

const PERCENT_FIELDS = ["persen_hargajual", "persen_hargabatas"];

const normalizeStoredPercent = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const amount = currency(value, { precision: 2 });
  if (!Number.isFinite(amount.value) || amount.value < 0 || amount.value > 255)
    return null;
  return amount.value;
};

export async function up(knex) {
  const rows = await knex("produk_harga_default").select(
    "id",
    ...PERCENT_FIELDS,
  );

  for (const row of rows) {
    for (const field of PERCENT_FIELDS) {
      const amount = normalizeStoredPercent(row[field]);
      if (amount === null || amount !== Number(row[field])) {
        throw new Error(
          `Produk price percentage ${field} for row ${row.id} must be a whole number between 0 and 255 before migrating to DECIMAL(9,2).`,
        );
      }
    }
  }

  await knex.schema.alterTable("produk_harga_default", (table) => {
    table.decimal("persen_hargajual", 9, 2).unsigned().notNullable().alter();
    table.decimal("persen_hargabatas", 9, 2).unsigned().notNullable().alter();
  });
}

export async function down(knex) {
  const rows = await knex("produk_harga_default").select(
    "id",
    ...PERCENT_FIELDS,
  );

  for (const row of rows) {
    for (const field of PERCENT_FIELDS) {
      const amount = normalizeStoredPercent(row[field]);
      if (amount === null || !Number.isInteger(amount)) {
        throw new Error(
          `Cannot restore TINYINT UNSIGNED ${field} for row ${row.id}: fractional percentages would be lost.`,
        );
      }
    }
  }

  await knex.schema.alterTable("produk_harga_default", (table) => {
    table.tinyint("persen_hargajual").unsigned().notNullable().alter();
    table.tinyint("persen_hargabatas").unsigned().notNullable().alter();
  });
}
