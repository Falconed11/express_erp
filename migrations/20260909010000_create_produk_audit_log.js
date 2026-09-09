export async function up(knex) {
  await knex.schema.createTable("produk_audit_log", (table) => {
    table.increments("id");
    table.integer("id_produk").notNullable();
    table.string("action", 16).notNullable();
    table.string("field_name", 64).notNullable();
    table.json("before_value").nullable();
    table.json("after_value").nullable();
    table.integer("changed_by").nullable();
    table.datetime("changed_at").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("id_produk", "fk_produk_audit_log_produk")
      .references("id")
      .inTable("produk")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    table
      .foreign("changed_by", "fk_produk_audit_log_karyawan")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    table.index(
      ["id_produk", "changed_at"],
      "idx_produk_audit_log_produk_changed_at",
    );
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("produk_audit_log");
}
