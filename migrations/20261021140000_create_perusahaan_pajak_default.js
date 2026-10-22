const cartTotals = `
  SELECT id_proyek, versi,
    SUM(CASE WHEN instalasi = 0 THEN jumlah * harga ELSE 0 END) AS peralatan,
    SUM(CASE WHEN instalasi = 1 THEN jumlah * harga ELSE 0 END) AS instalasi
  FROM keranjangproyek
  GROUP BY id_proyek, versi
`;

export async function up(knex) {
  await knex.schema.createTable("perusahaan_pajak_default", (table) => {
    table.increments("id").primary();
    table.integer("id_perusahaan").notNullable();
    table.tinyint("persen").unsigned().notNullable();
    table.date("tanggal_aktif").notNullable();
    table.date("tanggal_kadaluarsa").notNullable();
    table.integer("created_by").nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.integer("updated_by").nullable();
    table
      .datetime("updated_at")
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));

    table.unique(
      ["id_perusahaan", "id"],
      "uq_perusahaan_pajak_default_company_id",
    );
    table
      .foreign("id_perusahaan", "fk_perusahaan_pajak_default_perusahaan")
      .references("id")
      .inTable("perusahaan")
      .onUpdate("CASCADE");
    table
      .foreign("created_by", "fk_perusahaan_pajak_default_created_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
    table
      .foreign("updated_by", "fk_perusahaan_pajak_default_updated_by")
      .references("id")
      .inTable("karyawan")
      .onUpdate("CASCADE");
  });

  await knex.schema.alterTable("perusahaan", (table) => {
    table.integer("id_pajak").unsigned().nullable();
    table.index(["id", "id_pajak"], "idx_perusahaan_id_pajak");
    table
      .foreign(["id", "id_pajak"], "fk_perusahaan_pajak_default_selected")
      .references(["id_perusahaan", "id"])
      .inTable("perusahaan_pajak_default")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");
  });

  await knex.schema.alterTable("rekapitulasiproyek", (table) => {
    table.tinyint("pajakpersen").unsigned().notNullable().defaultTo(0);
    table.tinyint("pajakinstalasipers").unsigned().notNullable().defaultTo(0);
    table.boolean("pakaipajakinstalasi").notNullable().defaultTo(false);
  });

  await knex.raw(`
    UPDATE rekapitulasiproyek AS r
    LEFT JOIN (${cartTotals}) AS totals
      ON totals.id_proyek = r.id_proyek AND totals.versi = r.versi
    SET
      r.pajakpersen = CASE
        WHEN COALESCE(totals.peralatan, 0) - COALESCE(r.diskon, 0) > 0
          THEN ROUND(r.pajak / (totals.peralatan - r.diskon) * 100)
        ELSE 0
      END,
      r.pajakinstalasipers = CASE
        WHEN COALESCE(totals.instalasi, 0) - COALESCE(r.diskoninstalasi, 0) > 0
          THEN ROUND(r.pajakinstalasi / (totals.instalasi - r.diskoninstalasi) * 100)
        ELSE 0
      END,
      r.pakaipajakinstalasi = COALESCE(r.pajakinstalasi, 0) > 0
  `);
}

export async function down(knex) {
  await knex.schema.alterTable("rekapitulasiproyek", (table) => {
    table.dropColumn("pakaipajakinstalasi");
    table.dropColumn("pajakinstalasipers");
    table.dropColumn("pajakpersen");
  });
  await knex.schema.alterTable("perusahaan", (table) => {
    table.dropForeign(
      ["id", "id_pajak"],
      "fk_perusahaan_pajak_default_selected",
    );
    table.dropIndex(["id", "id_pajak"], "idx_perusahaan_id_pajak");
    table.dropColumn("id_pajak");
  });
  await knex.schema.dropTableIfExists("perusahaan_pajak_default");
}
