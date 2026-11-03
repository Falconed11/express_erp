export async function up(knex) {
  await knex.schema.createTable("live_chat_message", (table) => {
    table.increments("id").primary();
    table.integer("id_perusahaan").notNullable();
    table.integer("id_user").notNullable();
    table.string("message", 1000).notNullable();
    table.boolean("aktif").notNullable().defaultTo(true);
    table
      .dateTime("created_at", { precision: 3 })
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP(3)"));
    table.integer("created_by").nullable();
    table
      .dateTime("updated_at", { precision: 3 })
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP(3)"));
    table.integer("updated_by").nullable();

    table.index(["id_perusahaan", "id"], "idx_live_chat_company_message");
    table.index(["id_user", "id"], "idx_live_chat_user_message");

    table
      .foreign("id_perusahaan", "fk_live_chat_message_company")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .foreign("id_user", "fk_live_chat_message_user")
      .references("id")
      .inTable("user")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .foreign("created_by", "fk_live_chat_message_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("updated_by", "fk_live_chat_message_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("live_chat_message");
}
