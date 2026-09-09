export async function up(knex) {
  await knex.schema.createTable("audit_log", (table) => {
    table.increments("id");
    table.string("table_name", 64).notNullable();
    table.bigInteger("record_id").notNullable();
    table.string("action", 16).notNullable();
    table.json("changes").notNullable();
    table.integer("changed_by").nullable();
    table.datetime("changed_at").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("changed_by", "fk_audit_log_karyawan")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");

    table.index(
      ["table_name", "record_id", "changed_at"],
      "idx_audit_log_record",
    );
    table.index(["table_name", "action", "changed_at"], "idx_audit_log_filter");
  });

  await knex.raw(`
    INSERT INTO audit_log
      (table_name, record_id, action, changes, changed_by, changed_at)
    SELECT
      'produk',
      id_produk,
      action,
      CASE
        WHEN changes IS NOT NULL THEN changes
        ELSE JSON_OBJECT(
          field_name,
          JSON_OBJECT('before', before_value, 'after', after_value)
        )
      END,
      changed_by,
      changed_at
    FROM produk_audit_log
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("audit_log");
}
