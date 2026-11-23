export async function up(knex) {
  const [column] = await knex.raw(
    "SHOW COLUMNS FROM laporan LIKE 'tipe_laporan'",
  );

  if (column.length === 0) {
    await knex.raw(
      "ALTER TABLE laporan CHANGE COLUMN isReport tipe_laporan TINYINT(1) NOT NULL DEFAULT 0",
    );
  }
}

export async function down(knex) {
  const [column] = await knex.raw(
    "SHOW COLUMNS FROM laporan LIKE 'isReport'",
  );

  if (column.length === 0) {
    await knex.raw(
      "ALTER TABLE laporan CHANGE COLUMN tipe_laporan isReport TINYINT(1) NOT NULL DEFAULT 0",
    );
  }
}
