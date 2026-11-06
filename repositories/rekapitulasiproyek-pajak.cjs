const { assertTransaction } = require("../helpers/transaction.cjs");

const toRate = (value) => {
  const rate = Number(value ?? 0);
  if (!Number.isInteger(rate) || rate < 0 || rate > 100) {
    throw new Error("Persentase pajak harus bilangan bulat antara 0 dan 100.");
  }
  return rate;
};

const getProjectEquipmentTaxPercent = async (conn, id_proyek) => {
  const [projectRows] = await conn.execute(
    "SELECT id_perusahaan FROM proyek WHERE id = ? FOR UPDATE",
    [id_proyek],
  );
  if (!projectRows.length) throw new Error("Proyek tidak ditemukan.");
  const [defaultRows] = await conn.execute(
    `SELECT ppd.persen FROM perusahaan_pajak_default ppd
     INNER JOIN perusahaan p
       ON p.id = ppd.id_perusahaan AND p.id_pajak = ppd.id
     WHERE p.id = ? LIMIT 1`,
    [projectRows[0].id_perusahaan],
  );
  return toRate(defaultRows[0]?.persen ?? 0);
};

const calculateTaxAmount = (subtotal, discount, percent) => {
  const taxableAmount = Math.max(
    0,
    Number(subtotal || 0) - Number(discount || 0),
  );
  const taxPercent = Number(percent || 0);
  return Number.isFinite(taxPercent)
    ? Math.ceil((taxableAmount * taxPercent) / 100)
    : 0;
};

const recalculateRecapTax = async (
  conn,
  id_proyek,
  versi,
  { recalculateEquipment = true, recalculateInstallation = true } = {},
) => {
  assertTransaction(conn, recalculateRecapTax.name);
  const [recapRows] = await conn.execute(
    `SELECT id, diskon, diskoninstalasi, pajakpersen,
            pajakinstalasipers, pakaipajakinstalasi
     FROM rekapitulasiproyek
     WHERE id_proyek = ? AND versi = ?
     FOR UPDATE`,
    [id_proyek, versi],
  );
  const recap = recapRows[0];
  if (!recap) return null;

  const [totalsRows] = await conn.execute(
    `SELECT
       COALESCE((
         SELECT SUM(kp.jumlah * kp.harga)
         FROM keranjangproyek kp
         LEFT JOIN keranjangproyek_composite_item ci
           ON ci.id_keranjangproyek = kp.id
         WHERE kp.id_proyek = ? AND kp.versi = ? AND kp.instalasi = 0
           AND ci.id IS NULL
       ), 0) + COALESCE((
         SELECT SUM(cg.jumlah * component_totals.unit_price)
         FROM keranjangproyek_composite cg
         JOIN (
           SELECT ci.id_composite,
                  SUM(kp.jumlah * COALESCE(kp.hargakustom, kp.harga)) AS unit_price
           FROM keranjangproyek_composite_item ci
           JOIN keranjangproyek kp ON kp.id = ci.id_keranjangproyek
           GROUP BY ci.id_composite
         ) component_totals ON component_totals.id_composite = cg.id
         WHERE cg.id_proyek = ? AND cg.versi = ? AND cg.instalasi = 0
       ), 0) AS peralatan,
       COALESCE((
         SELECT SUM(kp.jumlah * kp.harga)
         FROM keranjangproyek kp
         LEFT JOIN keranjangproyek_composite_item ci
           ON ci.id_keranjangproyek = kp.id
         WHERE kp.id_proyek = ? AND kp.versi = ? AND kp.instalasi = 1
           AND ci.id IS NULL
       ), 0) + COALESCE((
         SELECT SUM(cg.jumlah * component_totals.unit_price)
         FROM keranjangproyek_composite cg
         JOIN (
           SELECT ci.id_composite,
                  SUM(kp.jumlah * COALESCE(kp.hargakustom, kp.harga)) AS unit_price
           FROM keranjangproyek_composite_item ci
           JOIN keranjangproyek kp ON kp.id = ci.id_keranjangproyek
           GROUP BY ci.id_composite
         ) component_totals ON component_totals.id_composite = cg.id
         WHERE cg.id_proyek = ? AND cg.versi = ? AND cg.instalasi = 1
       ), 0) AS instalasi`,
    [id_proyek, versi, id_proyek, versi, id_proyek, versi, id_proyek, versi],
  );
  const totals = totalsRows[0] || {};
  const updates = {};
  if (recalculateEquipment) {
    updates.pajak = calculateTaxAmount(
      totals.peralatan,
      recap.diskon,
      recap.pajakpersen,
    );
  }
  if (recalculateInstallation) {
    updates.pajakinstalasi = recap.pakaipajakinstalasi
      ? calculateTaxAmount(
          totals.instalasi,
          recap.diskoninstalasi,
          recap.pajakinstalasipers,
        )
      : 0;
  }
  const fields = Object.keys(updates);
  if (fields.length) {
    await conn.execute(
      `UPDATE rekapitulasiproyek SET ${fields.map((field) => `${field} = ?`).join(", ")} WHERE id = ?`,
      [...fields.map((field) => updates[field]), recap.id],
    );
  }
  return updates;
};

module.exports = {
  recalculateRecapTax,
  calculateTaxAmount,
  getProjectEquipmentTaxPercent,
};
