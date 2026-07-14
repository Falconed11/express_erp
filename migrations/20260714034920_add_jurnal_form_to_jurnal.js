/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable("jurnal", (table) => {
    table.integer("id_jurnal_form").nullable().defaultTo(null).after("id");

    table
      .foreign("id_jurnal_form", "fk_jurnal_jurnal_form")
      .references("id")
      .inTable("jurnal_form")
      .onUpdate("CASCADE");
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable("jurnal", (table) => {
    table.dropForeign("id_jurnal_form", "fk_jurnal_jurnal_form");
    table.dropColumn("id_jurnal_form");
  });
}
