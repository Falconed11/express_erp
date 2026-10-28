export async function up(knex) {
  if (!(await knex.schema.hasColumn("pembayaranproyek", "tanggal_penagihan"))) {
    await knex.schema.alterTable("pembayaranproyek", (table) => {
      table.date("tanggal_penagihan").nullable().after("tanggal");
    });
  }

  await knex("pembayaranproyek")
    .whereNull("tanggal_penagihan")
    .update({ tanggal_penagihan: knex.ref("tanggal") });

  if (await knex.schema.hasColumn("proyek", "tanggal_penagihan")) {
    await knex.schema.alterTable("proyek", (table) => {
      table.dropColumn("tanggal_penagihan");
    });
  }
}

export async function down(knex) {
  if (await knex.schema.hasColumn("pembayaranproyek", "tanggal_penagihan")) {
    await knex.schema.alterTable("pembayaranproyek", (table) => {
      table.dropColumn("tanggal_penagihan");
    });
  }
  if (!(await knex.schema.hasColumn("proyek", "tanggal_penagihan"))) {
    await knex.schema.alterTable("proyek", (table) => {
      table.date("tanggal_penagihan").nullable();
    });
  }
}
