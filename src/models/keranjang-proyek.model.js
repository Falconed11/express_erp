import db from "../config/db.js";

const tableName = "keranjangproyek";
const qNilaiProyek = `
WITH totals AS (
  SELECT
    k.id_proyek,

    SUM(CASE WHEN k.instalasi = 0 THEN k.jumlah * k.harga ELSE 0 END) AS harga_barang,
    SUM(CASE WHEN k.instalasi = 1 THEN k.jumlah * k.harga ELSE 0 END) AS harga_instalasi

  FROM keranjangproyek k
  WHERE k.id_proyek = ?
  GROUP BY k.id_proyek
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
    const [rows] = await db.execute(qNilaiProyek, [idProyek]);
    return rows[0];
  },
};
export default KeranjangProyekModel;
