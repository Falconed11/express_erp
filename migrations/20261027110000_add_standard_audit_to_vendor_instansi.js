export async function up(knex) {
  for (const tableName of ["instansi", "vendor"]) {
    await knex.schema.alterTable(tableName, (table) => {
      table.integer("updated_by").nullable();
      table
        .datetime("updated_at")
        .notNullable()
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
      table
        .foreign("updated_by", `fk_${tableName}_updated_by`)
        .references("id")
        .inTable("karyawan")
        .onUpdate("CASCADE");
    });
    await knex.raw(
      `UPDATE ${tableName} SET updated_by = lastuser, updated_at = lastupdate`,
    );
  }
}

export async function down(knex) {
  for (const tableName of ["vendor", "instansi"]) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropForeign(["updated_by"], `fk_${tableName}_updated_by`);
      table.dropColumn("updated_by");
      table.dropColumn("updated_at");
    });
  }
}
