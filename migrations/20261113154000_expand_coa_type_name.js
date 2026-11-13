const PREVIOUS_NAME_LENGTH = 24;
const COA_TYPE_NAME_LENGTH = 64;

export async function up(knex) {
  await knex.schema.alterTable("coa_type", (table) => {
    table.string("nama", COA_TYPE_NAME_LENGTH).notNullable().alter();
  });
}

export async function down(knex) {
  const row = await knex("coa_type")
    .select("id")
    .whereRaw("CHAR_LENGTH(??) > ?", ["nama", PREVIOUS_NAME_LENGTH])
    .first();
  if (row) {
    throw new Error(
      `Cannot restore coa_type.nama to ${PREVIOUS_NAME_LENGTH} characters while longer names exist.`,
    );
  }

  await knex.schema.alterTable("coa_type", (table) => {
    table.string("nama", PREVIOUS_NAME_LENGTH).notNullable().alter();
  });
}
