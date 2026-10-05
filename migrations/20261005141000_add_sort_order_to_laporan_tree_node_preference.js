export async function up(knex) {
  await knex.schema.alterTable("laporan_tree_node_preference", (table) => {
    table.integer("sort_order").nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("laporan_tree_node_preference", (table) => {
    table.dropColumn("sort_order");
  });
}
