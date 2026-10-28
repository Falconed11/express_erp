export async function up(knex) {
  if (await knex.schema.hasColumn("proyek", "tanggal_penagihan")) return;
  await knex.schema.alterTable("proyek", (table) => {
    table.date("tanggal_penagihan").nullable();
  });
}

export async function down(knex) {
  if (!(await knex.schema.hasColumn("proyek", "tanggal_penagihan"))) return;
  await knex.schema.alterTable("proyek", (table) => {
    table.dropColumn("tanggal_penagihan");
  });
}
