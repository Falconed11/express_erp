export async function up(knex) {
  await knex.schema.alterTable("perusahaan_pajak_default", (table) => {
    table.date("tanggal_aktif").nullable().alter();
    table.date("tanggal_kadaluarsa").nullable().alter();
  });
}

export async function down(knex) {
  const rowWithNullDate = await knex("perusahaan_pajak_default")
    .whereNull("tanggal_aktif")
    .orWhereNull("tanggal_kadaluarsa")
    .first("id");
  if (rowWithNullDate) {
    throw new Error(
      "Cannot restore required tax-default dates while null dates exist.",
    );
  }

  await knex.schema.alterTable("perusahaan_pajak_default", (table) => {
    table.date("tanggal_aktif").notNullable().alter();
    table.date("tanggal_kadaluarsa").notNullable().alter();
  });
}
