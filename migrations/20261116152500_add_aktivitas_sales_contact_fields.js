export async function up(knex) {
  await knex.schema.alterTable("aktivitassales", (table) => {
    table.string("jabatan", 100).notNullable().defaultTo("");
    table.string("kontak", 100).notNullable().defaultTo("");
    table.string("email", 254).notNullable().defaultTo("");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("aktivitassales", (table) => {
    table.dropColumn("jabatan");
    table.dropColumn("kontak");
    table.dropColumn("email");
  });
}
