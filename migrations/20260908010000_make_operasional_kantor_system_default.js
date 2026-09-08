const SYSTEM_KEY = "OPERASIONAL_KANTOR";
const FORM_NAME = "Operasional Kantor";

export async function up(knex) {
  await knex.schema.alterTable("jurnal_form", (table) => {
    table
      .string("system_key", 64)
      .nullable()
      .unique("uniq_jurnal_form_system_key");
  });

  const existing = await knex("jurnal_form").where("nama", FORM_NAME).first();

  if (existing) {
    await knex("jurnal_form")
      .where("id", existing.id)
      .update({ system_key: SYSTEM_KEY });
  } else {
    await knex("jurnal_form").insert({
      nama: FORM_NAME,
      system_key: SYSTEM_KEY,
      extra_fields: JSON.stringify([]),
      keterangan: "System default",
      aktif: true,
    });
  }

  await knex("app_config")
    .where("key", "form_operasional_kantor")
    .whereNull("id_perusahaan")
    .del();
}

export async function down(knex) {
  await knex("app_config")
    .where("key", "form_operasional_kantor")
    .whereNull("id_perusahaan")
    .del();

  await knex.schema.alterTable("jurnal_form", (table) => {
    table.dropUnique(["system_key"], "uniq_jurnal_form_system_key");
    table.dropColumn("system_key");
  });
}
