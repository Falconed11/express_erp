export async function up(knex) {
  await knex.schema.alterTable("vendor", (table) => {
    table.boolean("aktif").notNullable().defaultTo(true);
  });
  await knex.schema.alterTable("instansi", (table) => {
    table.boolean("aktif").notNullable().defaultTo(true);
  });
}

export async function down(knex) {
  await knex.schema.alterTable("instansi", (table) => {
    table.dropColumn("aktif");
  });
  await knex.schema.alterTable("vendor", (table) => {
    table.dropColumn("aktif");
  });
}
