export async function up(knex) {
  await knex.schema.alterTable("user_settings", (table) => {
    table.integer("default_operasional_produksi_id_coa").nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("user_settings", (table) => {
    table.dropColumn("default_operasional_produksi_id_coa");
  });
}
