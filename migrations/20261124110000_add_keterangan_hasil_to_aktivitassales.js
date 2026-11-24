export async function up(knex) {
  await knex.schema.alterTable("aktivitassales", (table) => {
    table.text("keterangan_hasil").nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("aktivitassales", (table) => {
    table.dropColumn("keterangan_hasil");
  });
}
