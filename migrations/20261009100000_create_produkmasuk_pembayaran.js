export async function up(knex) {
  await knex.schema.createTable("produkmasuk_pembayaran", (table) => {
    table.increments("id").primary();
    table.integer("id_produkmasuk").notNullable();
    table.integer("id_jurnal").notNullable();
    table.boolean("aktif").notNullable().defaultTo(true);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table
      .datetime("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
    table.integer("created_by").nullable();
    table.integer("updated_by").nullable();
    table.index("id_produkmasuk", "idx_produkmasuk_pembayaran_produkmasuk");
    table.index("id_jurnal", "idx_produkmasuk_pembayaran_jurnal");
    table
      .foreign("id_produkmasuk", "fk_produkmasuk_pembayaran_produkmasuk")
      .references("id")
      .inTable("produkmasuk")
      .onUpdate("CASCADE");
    table
      .foreign("id_jurnal", "fk_produkmasuk_pembayaran_jurnal")
      .references("id")
      .inTable("jurnal")
      .onUpdate("CASCADE");
    table
      .foreign("created_by", "fk_produkmasuk_pembayaran_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("updated_by", "fk_produkmasuk_pembayaran_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("produkmasuk_pembayaran");
}
