export async function up(knex) {
  await knex.schema.alterTable("operasionalproduksi", (table) => {
    table.integer("created_by").nullable();
    table.integer("updated_by").nullable();
    table
      .foreign("created_by", "fk_operasionalproduksi_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
    table
      .foreign("updated_by", "fk_operasionalproduksi_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("operasionalproduksi", (table) => {
    table.dropForeign(["created_by"], "fk_operasionalproduksi_created_by");
    table.dropForeign(["updated_by"], "fk_operasionalproduksi_updated_by");
    table.dropColumn("created_by");
    table.dropColumn("updated_by");
  });
}
