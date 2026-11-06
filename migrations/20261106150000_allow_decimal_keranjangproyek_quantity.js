export async function up(knex) {
  await knex.schema.alterTable("keranjangproyek", (table) => {
    table.decimal("jumlah", 15, 3).notNullable().alter();
  });
}

export async function down(knex) {
  const fractionalRow = await knex("keranjangproyek")
    .select("id")
    .whereRaw(
      "jumlah <> FLOOR(jumlah) OR jumlah > 2147483647 OR jumlah < -2147483648",
    )
    .first();
  if (fractionalRow) {
    throw new Error(
      "Cannot restore integer product quantities while fractional or out-of-range values exist.",
    );
  }
  await knex.schema.alterTable("keranjangproyek", (table) => {
    table.integer("jumlah").notNullable().alter();
  });
}
