export async function up(knex) {
  await knex.schema.createTable("proyek_penawaran_approval", (table) => {
    table.increments("id");
    table.integer("id_proyek").notNullable();
    table.integer("versi").notNullable();
    table.string("approved_level", 20).nullable();
    table.integer("approved_by").nullable();
    table.string("approved_role", 32).nullable();
    table.datetime("approved_at").nullable();
    table.boolean("aktif").notNullable().defaultTo(true);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.integer("created_by").nullable();
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());
    table.integer("updated_by").nullable();

    table.unique(
      ["id_proyek", "versi"],
      "uq_proyek_penawaran_approval_version",
    );
    table.index(
      ["id_proyek", "aktif"],
      "idx_proyek_penawaran_approval_project",
    );

    table
      .foreign("id_proyek", "fk_proyek_penawaran_approval_proyek")
      .references("id")
      .inTable("proyek")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .foreign("approved_by", "fk_proyek_penawaran_approval_approved_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("created_by", "fk_proyek_penawaran_approval_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .foreign("updated_by", "fk_proyek_penawaran_approval_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("proyek_penawaran_approval");
}
