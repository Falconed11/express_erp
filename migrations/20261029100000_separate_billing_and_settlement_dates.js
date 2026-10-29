export async function up(knex) {
  if (!(await knex.schema.hasColumn("pembayaranproyek", "status_penagihan"))) {
    await knex.schema.alterTable("pembayaranproyek", (table) => {
      table.string("status_penagihan", 16).notNullable().defaultTo("waiting");
    });
  }

  await knex.raw(`
    UPDATE pembayaranproyek
    SET tanggal_penagihan = tanggal
    WHERE tanggal_penagihan IS NULL AND tanggal IS NOT NULL
  `);

  await knex.raw(`
    UPDATE pembayaranproyek
    SET status_penagihan = CASE
      WHEN status = 1 THEN 'paid'
      WHEN tanggal_penagihan IS NULL THEN 'not-billed'
      ELSE 'waiting'
    END
  `);

  await knex("pembayaranproyek").where("status", 0).update({ tanggal: null });

  await knex.schema.alterTable("pembayaranproyek", (table) => {
    table
      .string("status_penagihan", 16)
      .notNullable()
      .defaultTo("waiting")
      .alter();
    table.date("tanggal").nullable().alter();
  });
}

export async function down(knex) {
  const unsettledPayment = await knex("pembayaranproyek")
    .whereNull("tanggal")
    .first("id");
  if (unsettledPayment) {
    throw new Error(
      "Cannot restore pembayaranproyek.tanggal as required while unsettled payments have no settlement date.",
    );
  }

  await knex.schema.alterTable("pembayaranproyek", (table) => {
    table.date("tanggal").notNullable().alter();
    table.dropColumn("status_penagihan");
  });
}
