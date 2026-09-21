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
      db.raw("1 as aktif"),
    )
    .join("jurnal_form as jf", "jf.id", "j.id_jurnal_form")
    .join("transaksi as debit", function () {
      this.on("debit.id_jurnal", "j.id").andOn(
        "debit.tipe",
        "=",
        db.raw("?", [1]),
      );
    })
    .where("j.id_proyek", idProyek)
    .andWhere("jf.nama", HPP_FORM_NAME);

const list = async (idProyek) => {
  const [legacyRows, journalRows] = await Promise.all([
    listLegacy(idProyek),
    listHppJournals(idProyek),
  ]);
  return [...legacyRows, ...journalRows].sort(
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
