const refs = [
  ["aktivitassales", "id_karyawan"],
  ["coa", "created_by"],
  ["coa", "updated_by"],
  ["coa_filter", "created_by"],
  ["coa_filter", "updated_by"],
  ["coa_filter_map", "created_by"],
  ["coa_filter_map", "updated_by"],
  ["coa_subtype", "created_by"],
  ["coa_subtype", "updated_by"],
  ["coa_type", "created_by"],
  ["coa_type", "updated_by"],
  ["golonganinstansi", "authorid_karyawan"],
  ["golonganinstansi", "lastid_karyawan"],
  ["instansi", "lastuser"],
  ["jenisinstansi", "authorid_karyawan"],
  ["jenisinstansi", "lastid_karyawan"],
  ["jenisproyek", "authorid_karyawan"],
  ["jenisproyek", "lastid_karyawan"],
  ["jurnal", "created_by"],
  ["jurnal", "updated_by"],
  ["laporan", "created_by"],
  ["laporan", "updated_by"],
  ["laporan_relation", "created_by"],
  ["laporan_relation", "updated_by"],
  ["operasionalkantor", "id_karyawan"],
];

async function dropForeignIfExists(knex, table, column) {
  const [rows] = await knex.raw(
    `
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    [table, column],
  );

  if (rows.length > 0) {
    await knex.raw(`
      ALTER TABLE \`${table}\`
      DROP FOREIGN KEY \`${rows[0].CONSTRAINT_NAME}\`
    `);
  }
}

export async function up(knex) {
  // Drop all foreign keys
  for (const [table, column] of refs) {
    await dropForeignIfExists(knex, table, column);
  }

  // Change FK columns
  for (const [table, column] of refs) {
    await knex.raw(`
      ALTER TABLE \`${table}\`
      MODIFY COLUMN \`${column}\` INT NULL;
    `);
  }

  // Change primary key
  await knex.raw(`
    ALTER TABLE \`karyawan\`
    MODIFY COLUMN \`id\` INT NOT NULL AUTO_INCREMENT;
  `);

  // Recreate foreign keys
  for (const [table, column] of refs) {
    await knex.schema.alterTable(table, (t) => {
      t.foreign(column)
        .references("id")
        .inTable("karyawan")
        .onUpdate("CASCADE");
    });
  }
}

export async function down(knex) {
  // Drop all foreign keys
  for (const [table, column] of refs) {
    await dropForeignIfExists(knex, table, column);
  }

  // Restore INT(1)
  for (const [table, column] of refs) {
    await knex.raw(`
      ALTER TABLE \`${table}\`
      MODIFY COLUMN \`${column}\` INT(1) NULL;
    `);
  }

  // Restore primary key
  await knex.raw(`
    ALTER TABLE \`karyawan\`
    MODIFY COLUMN \`id\` INT(1) NOT NULL AUTO_INCREMENT;
  `);

  // Recreate foreign keys
  for (const [table, column] of refs) {
    await knex.schema.alterTable(table, (t) => {
      t.foreign(column)
        .references("id")
        .inTable("karyawan")
        .onUpdate("CASCADE");
    });
  }
}
