export async function up(knex) {
  await knex.schema.alterTable("vendor", (table) => {
    table.string("nama", 100).notNullable().alter();
  });
  await knex.schema.alterTable("proyek", (table) => {
    table.string("klien", 100).notNullable().alter();
  });
  await knex.schema.alterTable("instansi", (table) => {
    table.string("nama", 100).notNullable().alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("instansi", (table) => {
    table.string("nama", 32).notNullable().alter();
  });
  await knex.schema.alterTable("proyek", (table) => {
    table.string("klien", 32).notNullable().alter();
  });
  await knex.schema.alterTable("vendor", (table) => {
    table.string("nama", 32).notNullable().alter();
  });
}
