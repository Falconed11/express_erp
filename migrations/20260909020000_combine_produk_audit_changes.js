export async function up(knex) {
  await knex.schema.alterTable("produk_audit_log", (table) => {
    table.dropForeign("id_produk", "fk_produk_audit_log_produk");
    table.string("field_name", 64).nullable().alter();
    table.json("before_value").nullable().alter();
    table.json("after_value").nullable().alter();
    table.json("changes").nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("produk_audit_log", (table) => {
    table.dropColumn("changes");
    table.string("field_name", 64).notNullable().alter();
    table.json("before_value").notNullable().alter();
    table.json("after_value").notNullable().alter();
    table
      .foreign("id_produk", "fk_produk_audit_log_produk")
      .references("id")
      .inTable("produk")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
  });
}
