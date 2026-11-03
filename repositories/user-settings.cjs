const { pool } = require("./db.2.0.0.cjs");

const DEFAULT_MODE = "tombol";
const MODES = new Set(["tombol", "popup"]);

const normalizeMode = (mode) => {
  if (!MODES.has(mode))
    throw new Error("Mode interaksi baris tabel tidak valid");
  return mode;
};

const get = async (idUser) => {
  const [rows] = await pool.execute(
    `select mode_interaksi_baris_tabel,
            default_operasional_kantor_id_coa,
            default_operasional_produksi_id_coa,
            default_produk_masuk_id_coa
     from user_settings where id_user=?`,
    [idUser],
  );
  return {
    mode_interaksi_baris_tabel:
      rows[0]?.mode_interaksi_baris_tabel || DEFAULT_MODE,
    default_operasional_kantor_id_coa:
      rows[0]?.default_operasional_kantor_id_coa ?? null,
    default_operasional_produksi_id_coa:
      rows[0]?.default_operasional_produksi_id_coa ?? null,
    default_produk_masuk_id_coa:
      rows[0]?.default_produk_masuk_id_coa ?? null,
  };
};

const update = async (idUser, mode) => {
  console.log(idUser, mode);
  const normalizedMode = normalizeMode(mode);
  await pool.execute(
    `insert into user_settings (id_user, mode_interaksi_baris_tabel)
     values (?, ?)
     on duplicate key update mode_interaksi_baris_tabel=values(mode_interaksi_baris_tabel)`,
    [idUser, normalizedMode],
  );
  return normalizedMode;
};

const normalizeCoaId = (idCoa) => {
  const normalizedId =
    idCoa == null || idCoa === "" ? null : Number(idCoa);
  if (
    normalizedId !== null &&
    (!Number.isInteger(normalizedId) || normalizedId <= 0)
  ) {
    throw new Error("Sumber dana default tidak valid");
  }
  return normalizedId;
};

const updateDefaultOperasionalKantorCoa = async (idUser, idCoa) => {
  const normalizedId = normalizeCoaId(idCoa);
  await pool.execute(
    `insert into user_settings (id_user, default_operasional_kantor_id_coa)
     values (?, ?)
     on duplicate key update
       default_operasional_kantor_id_coa=values(default_operasional_kantor_id_coa)`,
    [idUser, normalizedId],
  );
  return normalizedId;
};

const updateDefaultOperasionalProduksiCoa = async (idUser, idCoa) => {
  const normalizedId = normalizeCoaId(idCoa);
  await pool.execute(
    `insert into user_settings (id_user, default_operasional_produksi_id_coa)
     values (?, ?)
     on duplicate key update
       default_operasional_produksi_id_coa=values(default_operasional_produksi_id_coa)`,
    [idUser, normalizedId],
  );
  return normalizedId;
};

const updateDefaultProdukMasukCoa = async (idUser, idCoa) => {
  const normalizedId = normalizeCoaId(idCoa);
  await pool.execute(
    `insert into user_settings (id_user, default_produk_masuk_id_coa)
     values (?, ?)
     on duplicate key update
       default_produk_masuk_id_coa=values(default_produk_masuk_id_coa)`,
    [idUser, normalizedId],
  );
  return normalizedId;
};

module.exports = {
  get,
  update,
  updateDefaultOperasionalKantorCoa,
  updateDefaultOperasionalProduksiCoa,
  updateDefaultProdukMasukCoa,
  DEFAULT_MODE,
};
