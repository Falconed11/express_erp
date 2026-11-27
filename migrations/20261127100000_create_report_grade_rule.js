export async function up(knex) {
  await knex.schema.createTable("report_grade_rule", (table) => {
    table.increments("id").primary();
    table.string("panel", 32).notNullable();
    table.decimal("threshold", 18, 4).notNullable();
    table.string("message", 500).notNullable();
    table.unique(["panel", "threshold"], "uq_report_grade_panel_threshold");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("report_grade_rule");
}
