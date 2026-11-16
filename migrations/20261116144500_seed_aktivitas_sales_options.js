const CONFIG_KEY = "aktivitas_sales_options";

export async function up(knex) {
  const existing = await knex("app_config")
    .select("id")
    .where({ key: CONFIG_KEY })
    .whereNull("id_perusahaan")
    .first();

  if (existing) return;

  await knex("app_config").insert({
    key: CONFIG_KEY,
    value: JSON.stringify(["Kunjungan", "Presentasi"]),
    keterangan: "Pilihan aktivitas sales",
    aktif: true,
  });
}

export async function down(_knex) {
  // Keep the configured options when rolling back migrations.
}
