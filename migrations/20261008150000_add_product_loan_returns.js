export async function up(knex) {
  await knex.schema.alterTable("produkkeluar", (table) => {
    table.string("jenis_transaksi", 30).notNullable().defaultTo("pengeluaran");
  });

  await knex.schema.alterTable("produkpinjaman", (table) => {
    table.integer("id_produkmasuk_peminjam").nullable();
  });

  await knex.schema.alterTable("produkmasuk", (table) => {
    table.integer("id_produkpinjaman").nullable();
    table.string("jenis_transaksi", 30).notNullable().defaultTo("pembelian");
    table
      .foreign("id_produkpinjaman", "fk_produkmasuk_produkpinjaman")
      .references("id")
      .inTable("produkpinjaman")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });

  await knex.schema.alterTable("produkpinjaman", (table) => {
    table
      .foreign(
        "id_produkmasuk_peminjam",
        "fk_produkpinjaman_produkmasuk_peminjam",
      )
      .references("id")
      .inTable("produkmasuk")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });

  await knex.schema.createTable("produkpinjamanpengembalian", (table) => {
    table.specificType("id", "INT(11) NOT NULL AUTO_INCREMENT");
    table.primary(["id"]);
    table.integer("id_produkpinjaman").notNullable();
    table.integer("id_produkmasuk_peminjam").notNullable();
    table.integer("id_produkkeluar").notNullable().unique();
    table.integer("id_produkmasuk_pemberi").notNullable().unique();
    table.double("jumlah").notNullable();
    table.date("tanggal").notNullable();
    table
      .datetime("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());
    table.integer("created_by").nullable();
    table
      .foreign("id_produkpinjaman", "fk_produkpinjamanpengembalian_loan")
      .references("id")
      .inTable("produkpinjaman")
      .onUpdate("CASCADE");
    table
      .foreign(
        "id_produkmasuk_peminjam",
        "fk_produkpinjamanpengembalian_stockout",
      )
      .references("id")
      .inTable("produkmasuk")
      .onUpdate("CASCADE");
    table
      .foreign("id_produkkeluar", "fk_produkpinjamanpengembalian_outflow")
      .references("id")
      .inTable("produkkeluar")
      .onUpdate("CASCADE");
    table
      .foreign(
        "id_produkmasuk_pemberi",
        "fk_produkpinjamanpengembalian_stockin",
      )
      .references("id")
      .inTable("produkmasuk")
      .onUpdate("CASCADE");
    table
      .foreign("created_by", "fk_produkpinjamanpengembalian_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.index(
      ["id_produkpinjaman", "tanggal"],
      "idx_produkpinjamanpengembalian_loan_date",
    );
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("produkpinjamanpengembalian");
  await knex.schema.alterTable("produkpinjaman", (table) => {
    table.dropForeign(
      "id_produkmasuk_peminjam",
      "fk_produkpinjaman_produkmasuk_peminjam",
    );
  });
  await knex.schema.alterTable("produkmasuk", (table) => {
    table.dropForeign(
      "id_produkpinjaman",
      "fk_produkmasuk_produkpinjaman",
    );
    table.dropColumn("id_produkpinjaman");
    table.dropColumn("jenis_transaksi");
  });
  await knex.schema.alterTable("produkpinjaman", (table) => {
    table.dropColumn("id_produkmasuk_peminjam");
  });
  await knex.schema.alterTable("produkkeluar", (table) => {
    table.dropColumn("jenis_transaksi");
  });
}
