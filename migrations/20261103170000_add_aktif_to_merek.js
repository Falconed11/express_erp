export async function up(knex) {
  await knex.schema.alterTable("merek", (table) => {
    table.boolean("aktif").notNullable().defaultTo(true);
  });
}

export async function down(knex) {
  await knex.schema.alterTable("merek", (table) => {
    table.dropColumn("aktif");
  });
}
