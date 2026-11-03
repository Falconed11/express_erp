export async function up(knex) {
  await knex.schema.alterTable("live_chat_message", (table) => {
    table.dropForeign("id_perusahaan", "fk_live_chat_message_company");
    table.dropIndex(
      ["id_perusahaan", "id"],
      "idx_live_chat_company_message",
    );
    table.dropColumn("id_perusahaan");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("live_chat_message", (table) => {
    table.integer("id_perusahaan").nullable();
    table.index(["id_perusahaan", "id"], "idx_live_chat_company_message");
    table
      .foreign("id_perusahaan", "fk_live_chat_message_company")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
  });
}
