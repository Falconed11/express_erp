export async function up(knex) {
  await knex.schema.createTable("coa_role_visibility", (table) => {
    table.increments("id");
    table.integer("id_coa").notNullable();
    table.string("peran", 32).notNullable();
    table.integer("created_by").nullable();
    table.datetime("created_at").defaultTo(knex.fn.now());
    table.integer("updated_by").nullable();
    table
      .datetime("updated_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
    table.unique(["id_coa", "peran"], "uniq_coa_role_visibility");
    table
      .foreign("id_coa", "fk_coa_role_visibility_coa")
      .references("id")
      .inTable("coa")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .foreign("created_by", "fk_coa_role_visibility_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
    table
      .foreign("updated_by", "fk_coa_role_visibility_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("coa_role_visibility");
}
