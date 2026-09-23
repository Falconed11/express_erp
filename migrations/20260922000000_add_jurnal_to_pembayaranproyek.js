export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("pembayaranproyek", "id_jurnal");
  if (!hasColumn) {
    await knex.schema.alterTable("pembayaranproyek", (table) => {
      table
        .integer("id_jurnal")
        .nullable()
        .after("id_metodepembayaran")
        .index("idx_pembayaranproyek_id_jurnal");
      table
        .foreign("id_jurnal", "fk_pembayaranproyek_jurnal")
        .references("id")
        .inTable("jurnal")
        .onUpdate("CASCADE")
        .onDelete("SET NULL");
    });
  }
}

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("pembayaranproyek", "id_jurnal");
  if (hasColumn) {
    await knex.schema.alterTable("pembayaranproyek", (table) => {
      table.dropForeign("id_jurnal", "fk_pembayaranproyek_jurnal");
      table.dropIndex("id_jurnal", "idx_pembayaranproyek_id_jurnal");
      table.dropColumn("id_jurnal");
    });
  }
}
