exports.up = async (knex) => {
  await knex.schema.alterTable("jurnal", (table) => {
    table
      .integer("id_jurnal_original")
      .nullable()
      .index("idx_jurnal_original")
      .after("id");
    table
      .foreign("id_jurnal_original", "fk_jurnal_original")
      .references("id")
      .inTable("jurnal")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("jurnal", (table) => {
    table.dropForeign("id_jurnal_original", "fk_jurnal_original");
    table.dropIndex("id_jurnal_original", "idx_jurnal_original");
    table.dropColumn("id_jurnal_original");
  });
};
