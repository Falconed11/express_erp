export async function up(knex) {
  await knex.schema.alterTable("user_settings", (table) => {
    table.integer("default_produk_masuk_id_coa").nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("user_settings", (table) => {
    table.dropColumn("default_produk_masuk_id_coa");
  });
}
