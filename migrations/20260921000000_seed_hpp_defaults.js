export async function up(knex) {
  // System defaults are applied explicitly from the super-admin Config page.
}

export async function down() {
  // Keep system defaults intact during rollback; they may already be used by data.
}
