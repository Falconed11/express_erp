const PREVIOUS_NAME_LENGTH = 24;
const COA_NAME_LENGTH = 64;

export async function up(knex) {
  await knex.schema.alterTable("coa", (table) => {
    table.string("nama", COA_NAME_LENGTH).notNullable().alter();
  });
  await knex.schema.alterTable("coa_subtype", (table) => {
    table.string("nama", COA_NAME_LENGTH).notNullable().alter();
  });
}

export async function down(knex) {
  for (const tableName of ["coa", "coa_subtype"]) {
    const row = await knex(tableName)
      .select("id")
      .whereRaw("CHAR_LENGTH(??) > ?", ["nama", PREVIOUS_NAME_LENGTH])
      .first();
    if (row) {
      throw new Error(
        `Cannot restore ${tableName}.nama to ${PREVIOUS_NAME_LENGTH} characters while longer names exist.`,
      );
    }
  }

  await knex.schema.alterTable("coa", (table) => {
    table.string("nama", PREVIOUS_NAME_LENGTH).notNullable().alter();
  });
  await knex.schema.alterTable("coa_subtype", (table) => {
    table.string("nama", PREVIOUS_NAME_LENGTH).notNullable().alter();
  });
}
