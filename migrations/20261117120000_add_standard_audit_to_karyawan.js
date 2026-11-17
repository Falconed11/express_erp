export async function up(knex) {
  await knex.raw(`
    ALTER TABLE karyawan
      ADD COLUMN created_by INT NULL DEFAULT NULL AFTER inputcode,
      ADD COLUMN created_at DATETIME NULL DEFAULT NULL AFTER created_by,
      ADD COLUMN updated_by INT NULL DEFAULT NULL AFTER created_at,
      ADD COLUMN updated_at DATETIME NULL DEFAULT NULL AFTER updated_by
  `);

  await knex.raw(`
    UPDATE karyawan AS employee
    LEFT JOIN karyawan AS updater ON updater.id = employee.lastuser
    SET employee.updated_by = updater.id,
        employee.updated_at = employee.lastupdate
  `);

  // Legacy rows do not contain reliable creation audit data.
  await knex.raw(`
    ALTER TABLE karyawan
      MODIFY COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      MODIFY COLUMN updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      ADD CONSTRAINT fk_karyawan_created_by
        FOREIGN KEY (created_by) REFERENCES karyawan (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
      ADD CONSTRAINT fk_karyawan_updated_by
        FOREIGN KEY (updated_by) REFERENCES karyawan (id)
        ON UPDATE CASCADE ON DELETE SET NULL
  `);
}

export async function down(knex) {
  await knex.raw(`
    ALTER TABLE karyawan
      DROP FOREIGN KEY fk_karyawan_created_by,
      DROP FOREIGN KEY fk_karyawan_updated_by,
      DROP COLUMN created_by,
      DROP COLUMN created_at,
      DROP COLUMN updated_by,
      DROP COLUMN updated_at
  `);
}
