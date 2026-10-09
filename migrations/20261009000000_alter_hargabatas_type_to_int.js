export async function up(knex) {
  const hasHargabatasColumn = await knex.schema.hasColumn("produk", "hargabatas");

  await knex.schema.alterTable("produk", (table) => {
    if (!hasHargabatasColumn) {
      table.integer("hargabatas", 1).nullable();
      return;
    }

    table.integer("hargabatas", 1).nullable().alter();
  });
}

export async function down(knex) {
  const hasHargabatasColumn = await knex.schema.hasColumn("produk", "hargabatas");

  if (!hasHargabatasColumn) {
    return;
  }

  await knex.schema.alterTable("produk", (table) => {
    table.decimal("hargabatas", 15, 2).nullable().alter();
  });
}
