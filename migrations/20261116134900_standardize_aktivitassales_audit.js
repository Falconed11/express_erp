export async function up(knex) {
  await knex.raw(`
    ALTER TABLE aktivitassales
      MODIFY COLUMN lastupdate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHANGE COLUMN lastuser updated_by INT NULL DEFAULT NULL,
      ADD COLUMN created_at DATETIME NULL DEFAULT NULL AFTER inputcode,
      ADD COLUMN created_by INT NULL DEFAULT NULL AFTER created_at
  `);

  await knex.raw(`
    UPDATE aktivitassales AS activity
    LEFT JOIN karyawan AS employee ON employee.id = activity.updated_by
    SET activity.updated_by = NULL
    WHERE activity.updated_by IS NOT NULL
      AND employee.id IS NULL
  `);

  // Historical rows have no creation audit timestamp; keep it unknown.
  await knex.raw(`
    ALTER TABLE aktivitassales
      MODIFY COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      CHANGE COLUMN lastupdate updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      ADD CONSTRAINT fk_aktivitassales_created_by
        FOREIGN KEY (created_by) REFERENCES karyawan (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
      ADD CONSTRAINT fk_aktivitassales_updated_by
        FOREIGN KEY (updated_by) REFERENCES karyawan (id)
        ON UPDATE CASCADE ON DELETE SET NULL
  `);
}

export async function down(knex) {
  await knex.raw(`
    ALTER TABLE aktivitassales
      DROP FOREIGN KEY fk_aktivitassales_created_by,
      DROP FOREIGN KEY fk_aktivitassales_updated_by
  `);

  await knex.raw(`
    ALTER TABLE aktivitassales
      CHANGE COLUMN updated_by lastuser INT(1) NULL DEFAULT NULL,
      CHANGE COLUMN updated_at lastupdate DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      DROP COLUMN created_by,
      DROP COLUMN created_at
  `);
}
