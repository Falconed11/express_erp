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

    table.text("keterangan").notNullable().defaultTo("");
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
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("jurnal_form");
}
