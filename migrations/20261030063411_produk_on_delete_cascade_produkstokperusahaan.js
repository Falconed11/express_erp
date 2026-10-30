export async function up(knex) {
  // Step 1: Drop the existing foreign key constraint
  await knex.schema.alterTable("produkstokperusahaan", (table) => {
    table.dropForeign("id_produk", "fk_produkstokperusahaan_produk");
  });

  // Step 2: Re-add the foreign key with onDelete("CASCADE")
  await knex.schema.alterTable("produkstokperusahaan", (table) => {
    table
      .foreign("id_produk", "fk_produkstokperusahaan_produk")
      .references("id")
      .inTable("produk")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
  });
}

export async function down(knex) {
  // Step 1: Drop the cascade foreign key constraint
  await knex.schema.alterTable("produkstokperusahaan", (table) => {
    table.dropForeign("id_produk", "fk_produkstokperusahaan_produk");
  });

  // Step 2: Revert it back to the original state (without onDelete cascade)
  await knex.schema.alterTable("produkstokperusahaan", (table) => {
    table
      .foreign("id_produk", "fk_produkstokperusahaan_produk")
      .references("id")
      .inTable("produk")
      .onUpdate("CASCADE");
  });
}
