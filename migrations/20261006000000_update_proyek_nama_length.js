export async function up(knex) {
  await knex.schema.alterTable("proyek", (table) => {
    table.string("nama", 200).notNullable().alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("proyek", (table) => {
    table.string("nama", 32).notNullable().alter();
  });
}
