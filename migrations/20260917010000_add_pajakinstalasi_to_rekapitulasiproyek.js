export async function up(knex) {
  await knex.schema.alterTable("rekapitulasiproyek", (table) => {
    table.integer("pajakinstalasi", 1).notNullable().defaultTo(0);
  });
}

export async function down(knex) {
  await knex.schema.alterTable("rekapitulasiproyek", (table) => {
    table.dropColumn("pajakinstalasi");
  });
}
