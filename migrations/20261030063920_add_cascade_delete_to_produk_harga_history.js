/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Step 1: Drop the existing foreign key constraint for id_produk
  await knex.schema.alterTable("produk_harga_history", (table) => {
    table.dropForeign("id_produk", "fk_produk_harga_history_produk");
  });

  // Step 2: Re-add the foreign key with onDelete("CASCADE")
  await knex.schema.alterTable("produk_harga_history", (table) => {
    table
      .foreign("id_produk", "fk_produk_harga_history_produk")
      .references("id")
      .inTable("produk")
      .onUpdate("CASCADE")
      .onDelete("CASCADE"); // <-- Automatically deletes history rows when the product is deleted
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Step 1: Drop the cascade foreign key constraint
  await knex.schema.alterTable("produk_harga_history", (table) => {
    table.dropForeign("id_produk", "fk_produk_harga_history_produk");
  });

  // Step 2: Revert back to the original foreign key (without onDelete cascade)
  await knex.schema.alterTable("produk_harga_history", (table) => {
    table
      .foreign("id_produk", "fk_produk_harga_history_produk")
      .references("id")
      .inTable("produk")
      .onUpdate("CASCADE");
  });
}
