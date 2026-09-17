export async function up(knex) {
  await knex.raw(`
    ALTER TABLE produkkeluar
    DROP COLUMN lastuser,
    CHANGE COLUMN lastupdate updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  `);
}

export async function down(knex) {
  await knex.raw(`
    ALTER TABLE produkkeluar
    CHANGE COLUMN updated_at lastupdate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DROP COLUMN created_at,
    ADD COLUMN lastuser INT(1) NOT NULL
  `);
}
