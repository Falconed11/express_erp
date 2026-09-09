export async function up(knex) {
  await knex.schema.createTable("user_settings", (table) => {
    table.increments("id");
    table.integer("id_user").notNullable();
    table
      .string("mode_interaksi_baris_tabel", 32)
      .notNullable()
      .defaultTo("tombol");
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table
      .datetime("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
    table.unique(["id_user"], "uniq_user_settings_user");
    table
      .foreign("id_user", "fk_user_settings_user")
      .references("id")
      .inTable("user")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("user_settings");
}
