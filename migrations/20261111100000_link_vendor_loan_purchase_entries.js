export async function up(knex) {
  await knex.schema.alterTable("produkmasuk", (table) => {
    table.integer("id_produkmasuk_pinjaman_vendor").nullable();
    table.index(
      "id_produkmasuk_pinjaman_vendor",
      "idx_produkmasuk_vendor_loan_source",
    );
    table
      .foreign(
        "id_produkmasuk_pinjaman_vendor",
        "fk_produkmasuk_vendor_loan_source",
      )
      .references("id")
      .inTable("produkmasuk")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("produkmasuk", (table) => {
    table.dropForeign(
      "id_produkmasuk_pinjaman_vendor",
      "fk_produkmasuk_vendor_loan_source",
    );
    table.dropIndex(
      "id_produkmasuk_pinjaman_vendor",
      "idx_produkmasuk_vendor_loan_source",
    );
    table.dropColumn("id_produkmasuk_pinjaman_vendor");
  });
}
