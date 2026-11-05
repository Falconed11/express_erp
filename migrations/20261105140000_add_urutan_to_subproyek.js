export async function up(knex) {
  if (await knex.schema.hasColumn("subproyek", "urutan")) return;
  await knex.schema.alterTable("subproyek", (table) => {
    table.integer("urutan").unsigned().nullable();
  });
}

export async function down(knex) {
  if (!(await knex.schema.hasColumn("subproyek", "urutan"))) return;
  await knex.schema.alterTable("subproyek", (table) => {
    table.dropColumn("urutan");
  });
}
