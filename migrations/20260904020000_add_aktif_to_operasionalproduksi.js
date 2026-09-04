export async function up(knex) {
  await knex.schema.alterTable("operasionalproduksi", (table) => {
    table.boolean("aktif").notNullable().defaultTo(true);
  });
}

export async function down(knex) {
  await knex.schema.alterTable("operasionalproduksi", (table) => {
    table.dropColumn("aktif");
  });
}
