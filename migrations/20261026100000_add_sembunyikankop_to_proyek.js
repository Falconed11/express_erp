export async function up(knex) {
  await knex.schema.alterTable("proyek", (table) => {
    table.boolean("sembunyikankop").notNullable().defaultTo(false);
  });
}

export async function down(knex) {
  await knex.schema.alterTable("proyek", (table) => {
    table.dropColumn("sembunyikankop");
  });
}
