export async function up(knex) {
  await knex.schema.createTable("keranjangproyek_composite", (table) => {
    table.increments("id").primary();
    table.integer("id_proyek").notNullable();
    table.integer("versi").unsigned().notNullable();
    table.boolean("instalasi").notNullable().defaultTo(false);
    table.integer("id_subproyek").nullable();
    table.string("nama", 300).notNullable();
    table.decimal("jumlah", 12, 3).notNullable();
    table.string("satuan", 80).notNullable().defaultTo("");
    table.integer("urutan").nullable();
    table.integer("created_by").nullable();
    table.integer("updated_by").nullable();
    table
      .datetime("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .datetime("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.index(
      ["id_proyek", "versi", "instalasi", "id_subproyek"],
      "idx_keranjangproyek_composite_scope",
    );
    table
      .foreign("id_proyek", "fk_keranjangproyek_composite_proyek")
      .references("id")
      .inTable("proyek")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("id_subproyek", "fk_keranjangproyek_composite_subproyek")
      .references("id")
      .inTable("subproyek")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .foreign("created_by", "fk_keranjangproyek_composite_created_by")
      .references("id")
      .inTable("karyawan")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .foreign("updated_by", "fk_keranjangproyek_composite_updated_by")
      .references("id")
      .inTable("karyawan")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable(
    "keranjangproyek_composite_item",
    (table) => {
      table.increments("id").primary();
      table.integer("id_composite").unsigned().notNullable();
      table.integer("id_keranjangproyek").notNullable();
      table.unique(
        ["id_keranjangproyek"],
        "uq_keranjangproyek_composite_item_row",
      );
      table
        .foreign("id_composite", "fk_keranjangproyek_composite_item_group")
        .references("id")
        .inTable("keranjangproyek_composite")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table
        .foreign(
          "id_keranjangproyek",
          "fk_keranjangproyek_composite_item_keranjang",
        )
        .references("id")
        .inTable("keranjangproyek")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
    },
  );
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("keranjangproyek_composite_item");
  await knex.schema.dropTableIfExists("keranjangproyek_composite");
}
