export async function up(knex) {
  await knex.schema.createTable("app_config", (table) => {
    table.specificType("id", "INT(11) NOT NULL AUTO_INCREMENT");
    table.primary(["id"]);

    table.string("key", 32).notNullable();
    table.json("value");

    table.integer("id_perusahaan").nullable();

    table.integer("created_by").nullable();
    table.datetime("created_at").defaultTo(knex.fn.now());

    table.integer("updated_by").nullable();
    table
      .datetime("updated_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.text("keterangan").notNullable().defaultTo("");
    table.boolean("aktif").defaultTo(true);

    table.unique(["key", "id_perusahaan"], "uniq_app_config");

    table
      .foreign("id_perusahaan", "fk_app_config_perusahaan")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE");

    table
      .foreign("created_by", "fk_app_config_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");

    table
      .foreign("updated_by", "fk_app_config_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("app_config");
}
