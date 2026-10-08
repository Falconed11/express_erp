export async function up(knex) {
  await knex.schema.alterTable("produkmasuk", (table) => {
    table.integer("id_perusahaan").nullable();
    table
      .foreign("id_perusahaan", "fk_produkmasuk_perusahaan")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE");
  });

  await knex.schema.alterTable("produkkeluar", (table) => {
    table.integer("id_perusahaan").nullable();
    table
      .foreign("id_perusahaan", "fk_produkkeluar_perusahaan")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("produkstokperusahaan", (table) => {
    table.integer("id_produk").notNullable();
    table.integer("id_perusahaan").notNullable();
    table.double("stok").notNullable().defaultTo(0);
    table.boolean("aktif").notNullable().defaultTo(true);
    table
      .datetime("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .datetime("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
    table.integer("created_by").nullable();
    table.integer("updated_by").nullable();
    table.primary(["id_produk", "id_perusahaan"]);
    table
      .foreign("id_produk", "fk_produkstokperusahaan_produk")
      .references("id")
      .inTable("produk")
      .onUpdate("CASCADE");
    table
      .foreign("id_perusahaan", "fk_produkstokperusahaan_perusahaan")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE");
    table
      .foreign("created_by", "fk_produkstokperusahaan_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("updated_by", "fk_produkstokperusahaan_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });

  await knex.schema.createTable("produkpinjaman", (table) => {
    table.specificType("id", "INT(11) NOT NULL AUTO_INCREMENT");
    table.primary(["id"]);
    table.integer("id_produkkeluar").notNullable().unique();
    table.integer("id_produkmasuk").notNullable();
    table.integer("id_produk").notNullable();
    table.integer("id_perusahaan_pemberi").notNullable();
    table.integer("id_perusahaan_peminjam").notNullable();
    table.double("jumlah").notNullable();
    table.boolean("aktif").notNullable().defaultTo(true);
    table
      .datetime("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());
    table.integer("created_by").nullable();
    table
      .datetime("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
    table.integer("updated_by").nullable();
    table
      .foreign("id_produkkeluar", "fk_produkpinjaman_produkkeluar")
      .references("id")
      .inTable("produkkeluar")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("id_produkmasuk", "fk_produkpinjaman_produkmasuk")
      .references("id")
      .inTable("produkmasuk")
      .onUpdate("CASCADE");
    table
      .foreign("id_produk", "fk_produkpinjaman_produk")
      .references("id")
      .inTable("produk")
      .onUpdate("CASCADE");
    table
      .foreign("id_perusahaan_pemberi", "fk_produkpinjaman_pemberi")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE");
    table
      .foreign("id_perusahaan_peminjam", "fk_produkpinjaman_peminjam")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE");
    table
      .foreign("created_by", "fk_produkpinjaman_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("updated_by", "fk_produkpinjaman_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.index(
      ["id_perusahaan_pemberi", "id_perusahaan_peminjam"],
      "idx_produkpinjaman_perusahaan",
    );
  });

  await knex.raw(`
    INSERT INTO produkstokperusahaan (id_produk, id_perusahaan, stok)
    SELECT id_produk, id_perusahaan, SUM(jumlah - COALESCE(keluar, 0))
    FROM produkmasuk
    WHERE id_perusahaan IS NOT NULL
    GROUP BY id_produk, id_perusahaan
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("produkpinjaman");
  await knex.schema.dropTableIfExists("produkstokperusahaan");
  await knex.schema.alterTable("produkkeluar", (table) => {
    table.dropForeign("id_perusahaan", "fk_produkkeluar_perusahaan");
    table.dropColumn("id_perusahaan");
  });
  await knex.schema.alterTable("produkmasuk", (table) => {
    table.dropForeign("id_perusahaan", "fk_produkmasuk_perusahaan");
    table.dropColumn("id_perusahaan");
  });
}
