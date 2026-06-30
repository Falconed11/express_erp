function signedId(table) {
  table.specificType("id", "INT(11) NOT NULL AUTO_INCREMENT");
  table.primary(["id"]);
}

export async function up(knex) {
  await knex.schema.createTable("jurnal_form", (table) => {
    signedId(table);

    table.string("nama", 32).notNullable().unique();
    table.json("extra_fields");

    table.integer("created_by").nullable();
    table.datetime("created_at").defaultTo(knex.fn.now());

    table.integer("updated_by").nullable();
    table
      .datetime("updated_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.string("keterangan", 500);
    table.boolean("aktif").defaultTo(true);

    table
      .foreign("created_by", "fk_jurnal_form_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");

    table
      .foreign("updated_by", "fk_jurnal_form_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("jurnal_expression", (table) => {
    signedId(table);

    table.string("nama", 32).notNullable().unique();
    table.integer("id_filter").nullable();
    table.enu("filter_type", ["laporan", "type", "subtype", "coa"]).nullable();
    table.string("formula", 500);

    table.integer("created_by").nullable();
    table.datetime("created_at").defaultTo(knex.fn.now());

    table.integer("updated_by").nullable();
    table
      .datetime("updated_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.text("keterangan");
    table.boolean("aktif").defaultTo(true);

    table
      .foreign("created_by", "fk_jurnal_expression_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");

    table
      .foreign("updated_by", "fk_jurnal_expression_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("jurnal_form_expression", (table) => {
    signedId(table);

    table.integer("id_jurnal_form").notNullable();
    table.integer("id_jurnal_expression").notNullable();

    table.enu("input_type", ["debit", "kredit"]).nullable();
    table.integer("sort_order").nullable();

    table.integer("created_by").nullable();
    table.datetime("created_at").defaultTo(knex.fn.now());

    table.integer("updated_by").nullable();
    table
      .datetime("updated_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.text("keterangan");
    table.boolean("aktif").defaultTo(true);

    table.unique(["id_jurnal_form", "id_jurnal_expression"], "uniq_jfe");

    table
      .foreign("id_jurnal_form", "fk_jfe_form")
      .references("id")
      .inTable("jurnal_form")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    table
      .foreign("id_jurnal_expression", "fk_jfe_expression")
      .references("id")
      .inTable("jurnal_expression")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    table
      .foreign("created_by", "fk_jfe_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");

    table
      .foreign("updated_by", "fk_jfe_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("jurnal_form_expression");
  await knex.schema.dropTableIfExists("jurnal_expression");
  await knex.schema.dropTableIfExists("jurnal_form");
}
