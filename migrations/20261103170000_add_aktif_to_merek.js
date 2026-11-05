export async function up(knex) {
  if (await knex.schema.hasColumn("merek", "aktif")) return;
  await knex.schema.alterTable("merek", (table) => {
    table.boolean("aktif").notNullable().defaultTo(true);
  });
}

export async function down(knex) {
  if (!(await knex.schema.hasColumn("merek", "aktif"))) return;
  await knex.schema.alterTable("merek", (table) => {
    table.dropColumn("aktif");
  });
}
