const projectTotals = `
  SELECT id_proyek, versi,
    SUM(CASE WHEN instalasi = 0 THEN jumlah * harga ELSE 0 END) AS peralatan,
    SUM(CASE WHEN instalasi = 1 THEN jumlah * harga ELSE 0 END) AS instalasi
  FROM keranjangproyek
  GROUP BY id_proyek, versi
`;

export async function up(knex) {
  await knex.raw(`
    UPDATE rekapitulasiproyek AS r
    LEFT JOIN (${projectTotals}) AS totals
      ON totals.id_proyek = r.id_proyek AND totals.versi = r.versi
    SET
      r.pajak = CEIL(
        ((COALESCE(totals.peralatan, 0) - COALESCE(r.diskon, 0)) *
          COALESCE(r.pajak, 0)) / 100
      ),
      r.pajakinstalasi = CEIL(
        ((COALESCE(totals.instalasi, 0) - COALESCE(r.diskoninstalasi, 0)) *
          COALESCE(r.pajakinstalasi, 0)) / 100
      )
  `);
}

export async function down(knex) {
  await knex.raw(`
    UPDATE rekapitulasiproyek AS r
    LEFT JOIN (${projectTotals}) AS totals
      ON totals.id_proyek = r.id_proyek AND totals.versi = r.versi
    SET
      r.pajak = CASE
        WHEN COALESCE(totals.peralatan, 0) - COALESCE(r.diskon, 0) = 0 THEN 0
        ELSE ROUND(
          r.pajak / (COALESCE(totals.peralatan, 0) - COALESCE(r.diskon, 0)) * 100
        )
      END,
      r.pajakinstalasi = CASE
        WHEN COALESCE(totals.instalasi, 0) - COALESCE(r.diskoninstalasi, 0) = 0 THEN 0
        ELSE ROUND(
          r.pajakinstalasi /
            (COALESCE(totals.instalasi, 0) - COALESCE(r.diskoninstalasi, 0)) * 100
        )
      END
  `);
}
