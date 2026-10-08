export async function up(knex) {
  await knex.schema.alterTable("produk", (table) => {
    table.decimal("hargabatas", 15, 2).nullable();
    table.integer("main_vendor").nullable();
    table.index(["main_vendor"], "idx_produk_main_vendor");
    table
      .foreign("main_vendor", "fk_produk_main_vendor")
      .references("id")
      .inTable("vendor")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("produk", (table) => {
    table.dropForeign(["main_vendor"], "fk_produk_main_vendor");
    table.dropIndex(["main_vendor"], "idx_produk_main_vendor");
    table.dropColumn("main_vendor");
    table.dropColumn("hargabatas");
  });
}
