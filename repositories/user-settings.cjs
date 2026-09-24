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
    "select mode_interaksi_baris_tabel from user_settings where id_user=?",
    [idUser],
  );
  return rows[0]?.mode_interaksi_baris_tabel || DEFAULT_MODE;
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

module.exports = { get, update, DEFAULT_MODE };
