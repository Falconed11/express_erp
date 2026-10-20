export async function up(knex) {
  const rows = await knex("produk_harga_default").select(
    "persen_hargajual",
    "persen_hargabatas",
  );
  const hasOutOfRangeValue = rows.some((row) =>
    [row.persen_hargajual, row.persen_hargabatas].some((value) => {
      const rounded = Math.round(Number(value));
      return !Number.isFinite(rounded) || rounded < 0 || rounded > 255;
    }),
  );

  if (hasOutOfRangeValue) {
    throw new Error(
      "Produk price percentages must round to a value between 0 and 255 before migrating to TINYINT UNSIGNED.",
    );
  }

  await knex("produk_harga_default").update({
    persen_hargajual: knex.raw("ROUND(??)", ["persen_hargajual"]),
    persen_hargabatas: knex.raw("ROUND(??)", ["persen_hargabatas"]),
  });

  await knex.schema.alterTable("produk_harga_default", (table) => {
    table.tinyint("persen_hargajual").unsigned().notNullable().alter();
    table.tinyint("persen_hargabatas").unsigned().notNullable().alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("produk_harga_default", (table) => {
    table.decimal("persen_hargajual", 9, 3).notNullable().alter();
    table.decimal("persen_hargabatas", 9, 3).notNullable().alter();
  });
}
