export async function up(knex) {
  await knex.schema.alterTable("aktivitassales", (table) => {
    table.boolean("aktif").notNullable().defaultTo(true);
  });
}

export async function down(knex) {
  await knex.schema.alterTable("aktivitassales", (table) => {
    table.dropColumn("aktif");
  });
}
