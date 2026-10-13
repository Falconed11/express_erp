import db from "../config/knex.js";

const TABLE = "operasionalproduksi";
const HPP_FORM_NAME = "HPP";

const listLegacy = (idProyek) =>
  db(TABLE)
    .select(
      "operasionalproduksi.id",
      "operasionalproduksi.id_proyek",
      "operasionalproduksi.tanggal",
      "operasionalproduksi.deskripsi",
      "operasionalproduksi.nominal",
      "operasionalproduksi.aktif",
      "creator.nama as created_by_name",
      "updater.nama as updated_by_name",
    )
    .leftJoin(
      "karyawan as creator",
      "creator.id",
      "operasionalproduksi.created_by",
    )
    .leftJoin(
      "karyawan as updater",
      "updater.id",
      "operasionalproduksi.updated_by",
    )
    .where("operasionalproduksi.id_proyek", idProyek);

const listHppJournals = (idProyek) =>
  db("jurnal as j")
    .select(
      "j.id as id_jurnal",
      "j.id_proyek",
      "j.tanggal",
      "j.keterangan as deskripsi",
      "debit.amount as nominal",
      db.raw(`(
        SELECT GROUP_CONCAT(DISTINCT fund_coa.nama SEPARATOR ', ')
        FROM transaksi AS fund_transaction
        LEFT JOIN coa AS fund_coa ON fund_coa.id = fund_transaction.id_coa
        WHERE fund_transaction.id_jurnal = j.id
          AND fund_transaction.tipe = 0
      ) AS sumber_dana`),
      db.raw("1 as aktif"),
    )
    .join("jurnal_form as jf", "jf.id", "j.id_jurnal_form")
    .join(
      db("transaksi as debit")
        .select("id_jurnal")
        .sum({ amount: "amount" })
        .where("tipe", 1)
        .groupBy("id_jurnal")
        .as("debit"),
      "debit.id_jurnal",
      "j.id",
    )
    .where("j.id_proyek", idProyek)
    .andWhere("jf.nama", HPP_FORM_NAME)
    .whereNotExists(function () {
      this.select(db.raw("1"))
        .from("produkkeluar as stock_output")
        .whereRaw("stock_output.id_jurnal = j.id");
    });

const listProjectExpenses = (idProyek) =>
  db("pengeluaranproyek as pp")
    .select(
      "pp.id as id_pengeluaranproyek",
      "pp.id_proyek",
      "pp.tanggal",
      "pp.tanggal as tanggalpengeluaran",
      "pp.id_karyawan",
      "pp.id_produk as id",
      "pp.id_vendor",
      "pp.jumlah",
      "pp.harga as hargapengeluaran",
      "pp.status",
      "pp.keterangan as keteranganpp",
      "pk.id as id_produkkeluar",
      "pk.id_jurnal",
      "pk.id_produkmasuk",
      "pk.metodepengeluaran",
      "p.id_kustom",
      "p.nama",
      "p.tipe",
      "p.satuan",
      "p.hargamodal",
      "m.nama as merek",
      "k.nama as namakaryawan",
      "pm.harga as hargaprodukmasuk",
      "pm.pinjaman",
    )
    .leftJoin("produkkeluar as pk", "pk.id", "pp.id_produkkeluar")
    .leftJoin("produk as p", "p.id", "pp.id_produk")
    .leftJoin("merek as m", "m.id", "p.id_merek")
    .leftJoin("karyawan as k", "k.id", "pp.id_karyawan")
    .leftJoin("produkmasuk as pm", "pm.id", "pk.id_produkmasuk")
    .where("pp.id_proyek", idProyek);

const list = async (idProyek) => {
  const [legacyRows, journalRows, expenseRows] = await Promise.all([
    listLegacy(idProyek),
    listHppJournals(idProyek),
    listProjectExpenses(idProyek),
  ]);
  return [
    ...legacyRows.map((row) => ({ ...row, record_type: "legacy" })),
    ...journalRows.map((row) => ({ ...row, record_type: "journal" })),
    ...expenseRows.map((row) => ({ ...row, record_type: "expense" })),
  ].sort(
    (first, second) =>
      new Date(second.tanggal) - new Date(first.tanggal) ||
      (second.id_jurnal || second.id || 0) - (first.id_jurnal || first.id || 0),
  );
};

const total = async (idProyek) => {
  const [legacyTotal, journalTotal] = await Promise.all([
    db(TABLE)
      .where({ id_proyek: idProyek, aktif: true })
      .sum({ total: "nominal" })
      .first(),
    db("jurnal as j")
      .join("jurnal_form as jf", "jf.id", "j.id_jurnal_form")
      .join("transaksi as debit", function () {
        this.on("debit.id_jurnal", "j.id").andOn(
          "debit.tipe",
          "=",
          db.raw("?", [1]),
        );
      })
      .where("j.id_proyek", idProyek)
      .andWhere("jf.nama", HPP_FORM_NAME)
      .sum({ total: "debit.amount" })
      .first(),
  ]);

  return {
    total: Number(legacyTotal?.total || 0) + Number(journalTotal?.total || 0),
  };
};

const create = ({
  id_proyek,
  tanggal,
  deskripsi = "",
  nominal = 0,
  created_by,
  aktif = true,
}) =>
  db(TABLE).insert({
    id_proyek,
    tanggal,
    deskripsi,
    nominal,
    aktif,
    created_by,
    updated_by: created_by,
  });

const update = (
  id,
  idProyek,
  { tanggal, deskripsi, nominal, updated_by, aktif },
) => {
  const changes = {
    tanggal,
    deskripsi,
    nominal,
    updated_by,
    updated_at: db.fn.now(),
  };
  if (aktif !== undefined) changes.aktif = aktif;
  return db(TABLE).where({ id, id_proyek: idProyek }).update(changes);
};

const destroy = (id, idProyek) =>
  db(TABLE).where({ id, id_proyek: idProyek }).del();

export default { list, total, create, update, destroy };
