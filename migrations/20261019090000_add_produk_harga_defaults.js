export async function up(knex) {
  await knex.schema.alterTable("vendor", (table) => {
    table.boolean("is_main").notNullable().defaultTo(false);
  });

  await knex.schema.alterTable("produk", (table) => {
    table.boolean("hargajual_custom").notNullable().defaultTo(true);
    table.boolean("hargabatas_custom").notNullable().defaultTo(true);
  });

  await knex.schema.createTable("produk_harga_default", (table) => {
    table.increments("id").primary();
    table.string("scope", 24).notNullable();
    table
      .string("scope_key", 80)
      .notNullable()
      .unique("uniq_produk_harga_default_scope");
    table.integer("id_vendor").nullable();
    table.integer("id_kategori").nullable();
    table.decimal("persen_hargajual", 9, 3).notNullable();
    table.decimal("persen_hargabatas", 9, 3).notNullable();
    table.boolean("aktif").notNullable().defaultTo(true);
    table.integer("created_by").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.integer("updated_by").nullable();
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.index(
      ["scope", "id_vendor", "id_kategori"],
      "idx_produk_harga_default_scope",
    );
    table
      .foreign("id_vendor", "fk_produk_harga_default_vendor")
      .references("id")
      .inTable("vendor")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .foreign("id_kategori", "fk_produk_harga_default_kategori")
      .references("id")
      .inTable("kategoriproduk")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .foreign("created_by", "fk_produk_harga_default_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("updated_by", "fk_produk_harga_default_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("produk_harga_default");
  await knex.schema.alterTable("produk", (table) => {
    table.dropColumn("hargajual_custom");
    table.dropColumn("hargabatas_custom");
  });
  await knex.schema.alterTable("vendor", (table) => {
    table.dropColumn("is_main");
  });
}
