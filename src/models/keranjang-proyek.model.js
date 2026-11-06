import db from "../config/db.js";

const _tableName = "keranjangproyek";
const qNilaiProyek = `
WITH totals AS (
  SELECT
    ? AS id_proyek,
    COALESCE((
      SELECT SUM(kp.jumlah * kp.harga)
      FROM keranjangproyek kp
      LEFT JOIN keranjangproyek_composite_item ci
        ON ci.id_keranjangproyek = kp.id
      WHERE kp.id_proyek = ? AND kp.instalasi = 0 AND ci.id IS NULL
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
      WHERE cg.id_proyek = ? AND cg.instalasi = 0
    ), 0) AS harga_barang,
    COALESCE((
      SELECT SUM(kp.jumlah * kp.harga)
      FROM keranjangproyek kp
      LEFT JOIN keranjangproyek_composite_item ci
        ON ci.id_keranjangproyek = kp.id
      WHERE kp.id_proyek = ? AND kp.instalasi = 1 AND ci.id IS NULL
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
      WHERE cg.id_proyek = ? AND cg.instalasi = 1
    ), 0) AS harga_instalasi
)

SELECT
  t.harga_barang,
  IFNULL(r.diskon, 0) AS diskon_barang,

  -- pajak BARANG (value)
  (
    (t.harga_barang - IFNULL(r.diskon, 0))
    * IFNULL(r.pajak, 0) / 100
  ) AS pajak_barang,

  t.harga_instalasi,
  IFNULL(r.diskoninstalasi, 0) AS diskon_instalasi,

  -- TOTAL NILAI PROYEK
  (
    (t.harga_barang - IFNULL(r.diskon, 0))
    +
    (
      (t.harga_barang - IFNULL(r.diskon, 0))
      * IFNULL(r.pajak, 0) / 100
    )
    +
    (t.harga_instalasi - IFNULL(r.diskoninstalasi, 0))
  ) AS nilai_proyek

FROM totals t
LEFT JOIN rekapitulasiproyek r
  ON r.id_proyek = t.id_proyek;
`;

const KeranjangProyekModel = {
  async findAll() {
    const [rows] = await db.execute("SELECT * FROM proyek");
    return rows;
  },
  async getOfferingSummary(idProyek) {
    const [rows] = await db.execute(qNilaiProyek, [
      idProyek,
      idProyek,
      idProyek,
      idProyek,
      idProyek,
    ]);
    return rows[0];
  },
};
export default KeranjangProyekModel;
