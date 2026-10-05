export async function up(knex) {
  await knex.schema.createTable("laporan_tree_node_preference", (table) => {
    table.integer("id_laporan").notNullable();
    table
      .specificType(
        "node_key",
        "VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci",
      )
      .notNullable();
    table.boolean("default_open").notNullable().defaultTo(true);

    table.primary(["id_laporan", "node_key"]);
    table
      .foreign("id_laporan", "fk_laporan_tree_node_preference_laporan")
      .references("id")
      .inTable("laporan")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("laporan_tree_node_preference");
}
