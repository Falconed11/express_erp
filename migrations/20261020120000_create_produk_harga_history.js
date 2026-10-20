export async function up(knex) {
  await knex.schema.createTable("produk_harga_history", (table) => {
    table.increments("id").primary();
    table.integer("id_produk").notNullable();
    table.integer("id_vendor").nullable();
    table.integer("id_perusahaan").nullable();
    table.date("tanggal").notNullable();
    table.decimal("harga", 20, 4).notNullable();
    table.string("source", 32).notNullable().defaultTo("import");
    table.text("keterangan").nullable();
    table.boolean("aktif").notNullable().defaultTo(true);
    table.integer("created_by").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.integer("updated_by").nullable();
    table
      .timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.index(
      ["id_produk", "tanggal"],
      "idx_produk_harga_history_product_date",
    );
    table.index(
      ["id_vendor", "tanggal"],
      "idx_produk_harga_history_vendor_date",
    );
    table.index(
      ["id_perusahaan", "tanggal"],
      "idx_produk_harga_history_company_date",
    );
    table
      .foreign("id_produk", "fk_produk_harga_history_produk")
      .references("id")
      .inTable("produk")
      .onUpdate("CASCADE");
    table
      .foreign("id_vendor", "fk_produk_harga_history_vendor")
      .references("id")
      .inTable("vendor")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("id_perusahaan", "fk_produk_harga_history_perusahaan")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("created_by", "fk_produk_harga_history_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("updated_by", "fk_produk_harga_history_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });

  await knex.raw(`
    INSERT INTO produk_harga_history
      (id_produk, id_vendor, id_perusahaan, tanggal, harga, source)
    SELECT pm.id_produk,
           CASE WHEN v.id IS NULL THEN NULL ELSE pm.id_vendor END,
           CASE WHEN c.id IS NULL THEN NULL ELSE pm.id_perusahaan END,
           COALESCE(DATE(pm.tanggal), DATE(pm.lastupdate), CURRENT_DATE()),
           pm.harga,
           'legacy_import'
    FROM produkmasuk pm
    LEFT JOIN vendor v ON v.id = pm.id_vendor
    LEFT JOIN perusahaan c ON c.id = pm.id_perusahaan
    WHERE pm.jumlah = 0 AND COALESCE(pm.keluar, 0) = 0
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("produk_harga_history");
}
