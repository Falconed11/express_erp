const CONFIG_KEY = "aktivitas_sales_options";
const TYPE_TABLE = "jenis_aktivitas_sales";
const ACTIVITY_TABLE = "aktivitassales";

const parseOptions = (value) => {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed)
    ? parsed.filter((option) => typeof option === "string")
    : [];
};

const findOrCreateType = async (knex, name) => {
  const normalizedName = String(name ?? "").trim();
  if (!normalizedName) return null;

  const existing = await knex(TYPE_TABLE)
    .whereRaw("LOWER(nama) = LOWER(?)", [normalizedName])
    .first();
  if (existing) return existing.id;

  const [id] = await knex(TYPE_TABLE).insert({
    nama: normalizedName,
    aktif: true,
    keterangan: "Migrasi aktivitas sales",
  });
  return id;
};

export async function up(knex) {
  await knex.schema.createTable(TYPE_TABLE, (table) => {
    table.specificType("id", "INT(11) NOT NULL AUTO_INCREMENT");
    table.primary(["id"]);
    table.string("nama", 200).notNullable();
    table.boolean("aktif").notNullable().defaultTo(true);
    table.integer("created_by").nullable();
    table.datetime("created_at").defaultTo(knex.fn.now());
    table.integer("updated_by").nullable();
    table
      .datetime("updated_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
    table.text("keterangan").notNullable().defaultTo("");
    table.unique(["nama"], "uniq_jenis_aktivitas_sales_nama");
    table
      .foreign("created_by", "fk_jenis_aktivitas_sales_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
    table
      .foreign("updated_by", "fk_jenis_aktivitas_sales_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });

  await knex.schema.alterTable(ACTIVITY_TABLE, (table) => {
    table.integer("id_jenis_aktivitas").nullable();
    table.index(
      ["id_jenis_aktivitas"],
      "idx_aktivitassales_jenis_aktivitas",
    );
    table
      .foreign(
        "id_jenis_aktivitas",
        "fk_aktivitassales_jenis_aktivitas",
      )
      .references("id")
      .inTable(TYPE_TABLE)
      .onUpdate("CASCADE");
  });

  await findOrCreateType(knex, "Kunjungan");
  await findOrCreateType(knex, "Presentasi");

  const legacyConfig = await knex("app_config")
    .where({ key: CONFIG_KEY })
    .whereNull("id_perusahaan")
    .first();
  for (const option of parseOptions(legacyConfig?.value)) {
    await findOrCreateType(knex, option);
  }

  const existingActivities = await knex(ACTIVITY_TABLE)
    .distinct("aktivitas")
    .whereNotNull("aktivitas");
  for (const { aktivitas } of existingActivities) {
    const id = await findOrCreateType(knex, aktivitas);
    if (id != null) {
      await knex(ACTIVITY_TABLE)
        .where({ aktivitas })
        .update({ id_jenis_aktivitas: id });
    }
  }

  await knex.schema.alterTable(ACTIVITY_TABLE, (table) => {
    table.dropColumn("aktivitas");
  });
}

export async function down(knex) {
  await knex.schema.alterTable(ACTIVITY_TABLE, (table) => {
    table.string("aktivitas", 200).notNullable().defaultTo("");
  });

  await knex.raw(`
    UPDATE ${ACTIVITY_TABLE} AS activity
    LEFT JOIN ${TYPE_TABLE} AS activity_type
      ON activity_type.id = activity.id_jenis_aktivitas
    SET activity.aktivitas = COALESCE(activity_type.nama, "")
  `);

  await knex.schema.alterTable(ACTIVITY_TABLE, (table) => {
    table.dropForeign(
      "id_jenis_aktivitas",
      "fk_aktivitassales_jenis_aktivitas",
    );
    table.dropIndex(
      ["id_jenis_aktivitas"],
      "idx_aktivitassales_jenis_aktivitas",
    );
    table.dropColumn("id_jenis_aktivitas");
  });
  await knex.schema.dropTableIfExists(TYPE_TABLE);
}
