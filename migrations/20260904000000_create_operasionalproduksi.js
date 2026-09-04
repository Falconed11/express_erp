export async function up(knex) {
  await knex.schema.createTable("operasionalproduksi", (table) => {
    table.increments("id").primary();
    table.integer("id_proyek").notNullable();
    table.date("tanggal").notNullable();
    table.text("deskripsi").notNullable().defaultTo("");
    table.decimal("nominal", 18, 2).notNullable().defaultTo(0);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table
      .foreign("id_proyek", "fk_operasionalproduksi_proyek")
      .references("id")
      .inTable("proyek")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.index(["id_proyek", "tanggal"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("operasionalproduksi");
}
