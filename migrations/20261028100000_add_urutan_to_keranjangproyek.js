export async function up(knex) {
  if (await knex.schema.hasColumn("keranjangproyek", "urutan")) return;
  await knex.schema.alterTable("keranjangproyek", (table) => {
    table.integer("urutan").unsigned().nullable();
  });
}

export async function down(knex) {
  if (!(await knex.schema.hasColumn("keranjangproyek", "urutan"))) return;
  await knex.schema.alterTable("keranjangproyek", (table) => {
    table.dropColumn("urutan");
  });
}
