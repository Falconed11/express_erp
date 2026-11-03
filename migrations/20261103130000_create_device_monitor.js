export async function up(knex) {
  await knex.schema.createTable("device_monitor", (table) => {
    table.increments("id").primary();
    table.string("device_id", 36).notNullable().unique();
    table.integer("user_id").notNullable();
    table.string("active_page", 255).notNullable();
    table.string("browser", 80).nullable();
    table.string("platform", 100).nullable();
    table.string("device_type", 32).nullable();
    table.string("screen_size", 24).nullable();
    table.string("language", 35).nullable();
    table.text("user_agent").nullable();
    table.dateTime("last_seen").notNullable();
    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    table
      .dateTime("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.index(["last_seen"], "idx_device_monitor_last_seen");
    table
      .foreign("user_id", "fk_device_monitor_user")
      .references("id")
      .inTable("user")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("device_monitor");
}
