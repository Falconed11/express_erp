export async function up(knex) {
  await knex.schema.alterTable("laporan", (table) => {
    table.string("nama", 64).notNullable().alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("laporan", (table) => {
    table.string("nama", 24).notNullable().alter();
  });
}
