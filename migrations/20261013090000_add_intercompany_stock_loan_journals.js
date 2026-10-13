export async function up(knex) {
  await knex.schema.alterTable("produkpinjaman", (table) => {
    table.double("harga").notNullable().defaultTo(0);
    table.integer("id_jurnal_pemberi").nullable();
    table.integer("id_jurnal_peminjam").nullable();
    table
      .foreign("id_jurnal_pemberi", "fk_produkpinjaman_jurnal_pemberi")
      .references("id")
      .inTable("jurnal")
      .onUpdate("CASCADE");
    table
      .foreign("id_jurnal_peminjam", "fk_produkpinjaman_jurnal_peminjam")
      .references("id")
      .inTable("jurnal")
      .onUpdate("CASCADE");
  });

  await knex.raw(`
    UPDATE produkpinjaman loan
    INNER JOIN produkmasuk source ON source.id = loan.id_produkmasuk
    SET loan.harga = source.harga
  `);

  await knex.schema.alterTable("produkpinjamanpengembalian", (table) => {
    table.double("harga_peminjam").notNullable().defaultTo(0);
    table.integer("id_jurnal_pemberi").nullable();
    table.integer("id_jurnal_peminjam").nullable();
    table
      .foreign(
        "id_jurnal_pemberi",
        "fk_produkpinjamanpengembalian_jurnal_pemberi",
      )
      .references("id")
      .inTable("jurnal")
      .onUpdate("CASCADE");
    table
      .foreign(
        "id_jurnal_peminjam",
        "fk_produkpinjamanpengembalian_jurnal_peminjam",
      )
      .references("id")
      .inTable("jurnal")
      .onUpdate("CASCADE");
  });

  await knex.raw(`
    UPDATE produkpinjamanpengembalian returned
    INNER JOIN produkmasuk borrower_stock
      ON borrower_stock.id = returned.id_produkmasuk_peminjam
    SET returned.harga_peminjam = borrower_stock.harga
  `);
}

export async function down(knex) {
  await knex.schema.alterTable("produkpinjamanpengembalian", (table) => {
    table.dropForeign(
      "id_jurnal_peminjam",
      "fk_produkpinjamanpengembalian_jurnal_peminjam",
    );
    table.dropForeign(
      "id_jurnal_pemberi",
      "fk_produkpinjamanpengembalian_jurnal_pemberi",
    );
    table.dropColumn("id_jurnal_peminjam");
    table.dropColumn("id_jurnal_pemberi");
    table.dropColumn("harga_peminjam");
  });
  await knex.schema.alterTable("produkpinjaman", (table) => {
    table.dropForeign(
      "id_jurnal_peminjam",
      "fk_produkpinjaman_jurnal_peminjam",
    );
    table.dropForeign("id_jurnal_pemberi", "fk_produkpinjaman_jurnal_pemberi");
    table.dropColumn("id_jurnal_peminjam");
    table.dropColumn("id_jurnal_pemberi");
    table.dropColumn("harga");
  });
}
