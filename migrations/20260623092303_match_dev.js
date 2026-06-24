export async function up(knex) {
  return knex.schema.raw(`
    ALTER TABLE instansi
    MODIFY lastupdate TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
  `);
}

export async function down(knex) {
  return knex.schema.raw(`
    ALTER TABLE instansi
    MODIFY lastupdate TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP
  `);
}
