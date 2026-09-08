export async function up(knex) {
  await knex.schema.alterTable("produkkeluar", (table) => {
    table.integer("id_jurnal").nullable().after("id");
    table.integer("created_by").nullable();
    table.integer("updated_by").nullable();
    table.index(["id_jurnal"], "idx_produkkeluar_id_jurnal");
    table
      .foreign("id_jurnal", "fk_produkkeluar_jurnal")
      .references("id")
      .inTable("jurnal")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("created_by", "fk_produkkeluar_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
    table
      .foreign("updated_by", "fk_produkkeluar_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("produkkeluar", (table) => {
    table.dropForeign("id_jurnal", "fk_produkkeluar_jurnal");
    table.dropForeign("created_by", "fk_produkkeluar_created_by");
    table.dropForeign("updated_by", "fk_produkkeluar_updated_by");
    table.dropIndex(["id_jurnal"], "idx_produkkeluar_id_jurnal");
    table.dropColumn("created_by");
    table.dropColumn("updated_by");
    table.dropColumn("id_jurnal");
  });
}
