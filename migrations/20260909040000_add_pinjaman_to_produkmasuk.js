export async function up(knex) {
  await knex.schema.alterTable("produkmasuk", (table) => {
    table.boolean("pinjaman").notNullable().defaultTo(false);
  });
}

export async function down(knex) {
  await knex.schema.alterTable("produkmasuk", (table) => {
    table.dropColumn("pinjaman");
  });
}
