export async function up(knex) {
  const hasCoaColumn = await knex.schema.hasColumn(
    "pembayaranproyek",
    "id_coa",
  );
  const hasMethodColumn = await knex.schema.hasColumn(
    "pembayaranproyek",
    "id_metodepembayaran",
  );

  await knex.schema.alterTable("pembayaranproyek", (table) => {
    if (!hasCoaColumn) {
      table.integer("id_coa").nullable().after("id_metodepembayaran").index();
    }
    if (hasMethodColumn) {
      table.integer("id_metodepembayaran").nullable().alter();
    }
  });
}

export async function down(knex) {
  const hasCoaColumn = await knex.schema.hasColumn(
    "pembayaranproyek",
    "id_coa",
  );
  if (hasCoaColumn) {
    await knex.schema.alterTable("pembayaranproyek", (table) => {
      table.dropIndex("id_coa");
      table.dropColumn("id_coa");
    });
  }
}
