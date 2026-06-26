export async function up(knex) {
  await knex.schema
    // 1. Tabel jurnal_form
    .createTable("jurnal_form", (table) => {
      table.increments("id").primary();
      table.string("nama", 32).notNullable().unique();
      table.json("extra_fields");
      table.integer("created_by").unsigned();
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.integer("updated_by").unsigned();
      table
        .datetime("updated_at")
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
      table.string("keterangan", 500);
      table.tinyint("aktif", 1).defaultTo(1);

      // Foreign Keys
      table
        .foreign("created_by", "fk_jurnal_form_created_by")
        .references("id")
        .inTable("karyawan");
      table
        .foreign("updated_by", "fk_jurnal_form_updated_by")
        .references("id")
        .inTable("karyawan");
    })

    // 2. Tabel jurnal_expression
    .createTable("jurnal_expression", (table) => {
      table.increments("id").primary();
      table.string("nama", 32).notNullable().unique();
      table.integer("id_filter").defaultTo(null);
      table
        .enu("filter_type", ["laporan", "type", "subtype", "coa"])
        .defaultTo(null);
      table.string("formula", 500);
      table.integer("created_by").unsigned();
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.integer("updated_by").unsigned();
      table
        .datetime("updated_at")
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
      table.text("keterangan");
      table.tinyint("aktif", 1).defaultTo(1);

      // Foreign Keys
      table
        .foreign("created_by", "fk_jurnal_expression_created_by")
        .references("id")
        .inTable("karyawan");
      table
        .foreign("updated_by", "fk_jurnal_expression_updated_by")
        .references("id")
        .inTable("karyawan");
    })

    // 3. Tabel jurnal_form_expression (Pivot / Junction Table)
    .createTable("jurnal_form_expression", (table) => {
      table.increments("id").primary();
      table.integer("id_jurnal_form").unsigned().notNullable();
      table.integer("id_jurnal_expression").unsigned().notNullable();
      table.enu("input_type", ["debit", "kredit"]).defaultTo(null);
      table.tinyint("sort_order");
      table.integer("created_by").unsigned();
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.integer("updated_by").unsigned();
      table
        .datetime("updated_at")
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
      table.text("keterangan");
      table.tinyint("aktif", 1).defaultTo(1);

      // Foreign Keys & Unique Constraints
      table
        .foreign("created_by", "fk_jfe_created_by")
        .references("id")
        .inTable("karyawan");
      table
        .foreign("updated_by", "fk_jfe_updated_by")
        .references("id")
        .inTable("karyawan");

      table.unique(["id_jurnal_form", "id_jurnal_expression"], "uniq_jfe");

      table
        .foreign("id_jurnal_form", "fk_jfe_form")
        .references("id")
        .inTable("jurnal_form")
        .onUpdate("CASCADE");
      table
        .foreign("id_jurnal_expression", "fk_jfe_expression")
        .references("id")
        .inTable("jurnal_expression")
        .onUpdate("CASCADE");
    });
}

export async function down(knex) {
  await knex.schema
    .dropTableIfExists("jurnal_form_expression")
    .dropTableIfExists("jurnal_expression")
    .dropTableIfExists("jurnal_form");
}
