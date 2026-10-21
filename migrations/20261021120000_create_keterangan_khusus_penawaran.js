export async function up(knex) {
  await knex.schema.createTable("keterangan_khusus_penawaran", (table) => {
    table.increments("id").primary();
    table.integer("id_proyek").notNullable();
    table.integer("versi").notNullable();
    table.text("keterangan").notNullable();
    table.boolean("aktif").notNullable().defaultTo(true);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.integer("created_by").nullable();
    table
      .datetime("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
    table.integer("updated_by").nullable();

    table.index(
      ["id_proyek", "versi", "aktif"],
      "idx_keterangan_khusus_penawaran_scope",
    );
    table
      .foreign("id_proyek", "fk_keterangan_khusus_penawaran_proyek")
      .references("id")
      .inTable("proyek")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .foreign("created_by", "fk_keterangan_khusus_penawaran_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
    table
      .foreign("updated_by", "fk_keterangan_khusus_penawaran_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("keterangan_khusus_penawaran");
}
