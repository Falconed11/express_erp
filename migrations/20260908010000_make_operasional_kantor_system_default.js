export async function up(knex) {
  await knex.schema.alterTable("jurnal_form", (table) => {
    table
      .string("system_key", 64)
      .nullable()
      .unique("uniq_jurnal_form_system_key");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("jurnal_form", (table) => {
    table.dropUnique(["system_key"], "uniq_jurnal_form_system_key");
    table.dropColumn("system_key");
  });
}
