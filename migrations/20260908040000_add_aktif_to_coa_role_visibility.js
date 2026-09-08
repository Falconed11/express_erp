export async function up(knex) {
  await knex.schema.alterTable("coa_role_visibility", (table) => {
    table.boolean("aktif").notNullable().defaultTo(true).after("peran");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("coa_role_visibility", (table) => {
    table.dropColumn("aktif");
  });
}
