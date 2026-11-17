export async function up(knex) {
  for (const [tableName, amountType] of [
    ["target_kunjungan", "integer"],
    ["target_omset", "decimal"],
  ]) {
    await knex.schema.createTable(tableName, (table) => {
      table.increments("id").primary();
      table.date("tanggal").notNullable();
      table.integer("id_karyawan").notNullable();
      if (amountType === "decimal") {
        table.decimal("jumlah", 18, 2).notNullable();
      } else {
        table.integer("jumlah").notNullable();
      }
      table.boolean("aktif").notNullable().defaultTo(true);
      table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
      table.integer("created_by").nullable();
      table
        .datetime("updated_at")
        .notNullable()
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
      table.integer("updated_by").nullable();

      table.index(["id_karyawan", "tanggal"], `idx_${tableName}_employee_date`);
      table
        .foreign("id_karyawan", `fk_${tableName}_karyawan`)
        .references("id")
        .inTable("karyawan")
        .onUpdate("CASCADE")
        .onDelete("RESTRICT");
      table
        .foreign("created_by", `fk_${tableName}_created_by`)
        .references("id")
        .inTable("karyawan")
        .onUpdate("CASCADE")
        .onDelete("SET NULL");
      table
        .foreign("updated_by", `fk_${tableName}_updated_by`)
        .references("id")
        .inTable("karyawan")
        .onUpdate("CASCADE")
        .onDelete("SET NULL");
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("target_omset");
  await knex.schema.dropTableIfExists("target_kunjungan");
}
