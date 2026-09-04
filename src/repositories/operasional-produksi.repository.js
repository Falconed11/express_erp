import db from "../config/knex.js";

const TABLE = "operasionalproduksi";

const list = (idProyek) =>
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
    .where("id_proyek", idProyek)
    .orderBy("tanggal", "desc")
    .orderBy("id", "desc");

const total = (idProyek) =>
  db(TABLE)
    .where({ id_proyek: idProyek, aktif: true })
    .sum({ total: "nominal" })
    .first()
    .then((row) => ({ total: Number(row?.total || 0) }));

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
