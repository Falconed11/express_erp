const connection = require("./db.cjs");
const { pool } = require("./db.2.0.0.cjs");
const { withTransaction } = require("../helpers/transaction.cjs");
const {
  invalidateApproval,
} = require("../src/modules/project-approval/project-approval-invalidation.cjs");
const { recalculateRecapTax } = require("./rekapitulasiproyek-pajak.cjs");
const table = "rekapitulasiproyek";
const toIntegerAmount = (value) => {
  const amount = Math.round(Number(value ?? 0));
  if (!Number.isSafeInteger(amount)) {
    throw new Error("Pajak harus berupa bilangan bulat yang valid.");
  }
  return amount;
};
const toRate = (value) => {
  const rate = Number(value ?? 0);
  if (!Number.isInteger(rate) || rate < 0 || rate > 100) {
    throw new Error("Persentase pajak harus bilangan bulat antara 0 dan 100.");
  }
  return rate;
};

const getProjectTaxDefaults = async (conn, id_proyek) => {
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

const list = ({ id_proyek, versi }) => {
  const sql = `Select r.* From ${table} r left join proyek p on r.id_proyek = p.id where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } and r.versi=?`;
  const values = [];
  values.push(id_proyek ?? undefined);
  values.push(versi);
  return new Promise((resolve, _reject) => {
    connection.query(sql, values, (err, res) => {
      console.log(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const listVersion = ({ id_proyek }) => {
  const sql = `select distinct versi from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  }`;
  const values = [];
  values.push(id_proyek ?? undefined);
  return new Promise((resolve, _reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = async ({
  id_proyek,
  versi,
  diskon,
  diskoninstalasi,
  pajak = 0,
  pajakinstalasi = 0,
  pajakinstalasipers = 0,
  pakaipajakinstalasi = false,
}) => {
  console.log({ id_proyek, versi });
  const sql = `insert into ${table} (id_proyek, versi, diskon, diskoninstalasi, pajak, pajakinstalasi, pajakpersen, pajakinstalasipers, pakaipajakinstalasi) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  return withTransaction(pool, async (conn) => {
    const defaultTaxPercent = await getProjectTaxDefaults(conn, id_proyek);
    const useInstallationTax = Boolean(pakaipajakinstalasi);
    const values = [
      id_proyek,
      versi,
      diskon,
      diskoninstalasi,
      toIntegerAmount(pajak),
      useInstallationTax ? toIntegerAmount(pajakinstalasi) : 0,
      defaultTaxPercent,
      useInstallationTax ? toRate(pajakinstalasipers) : 0,
      useInstallationTax,
    ];
    const [result] = await conn.execute(sql, values);
    await recalculateRecapTax(conn, id_proyek, versi, {
      recalculateInstallation: false,
    });
    await invalidateApproval(conn, id_proyek, versi);
    return result;
  });
};

const createkategoriProyek = async ({ id_proyek, versi, jenis_proyek }) => {
  const audio = jenis_proyek.includes("audio") ? 1 : 0;
  const cctv = jenis_proyek.includes("cctv") ? 1 : 0;
  const multimedia = jenis_proyek.includes("multimedia") ? 1 : 0;
  const sql = `insert into ${table} (id_proyek, audio, cctv, multimedia, versi) values ( ?, '${audio}', '${cctv}', '${multimedia}', ?)`;
  const values = [id_proyek, versi];
  return withTransaction(pool, async (conn) => {
    const [result] = await conn.execute(sql, values);
    return result;
  });
};

const createNewVersion = ({ id_proyek, versi }) => {
  const sql = `INSERT INTO ${table} (id_proyek, diskon, diskoninstalasi, pajak, pajakinstalasi, pajakpersen, pajakinstalasipers, pakaipajakinstalasi, audio, cctv, multimedia, versi) SELECT id_proyek, diskon, diskoninstalasi, pajak, pajakinstalasi, pajakpersen, pajakinstalasipers, pakaipajakinstalasi, audio, cctv, multimedia, (SELECT max(versi) + 1 from ${table} where id_proyek=?) FROM ${table}
  WHERE id_proyek=? and versi=?`;
  const values = [id_proyek, id_proyek, versi];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = async ({
  id,
  diskon,
  diskoninstalasi,
  pajak,
  pajakpersen,
  gunakanDefaultPajakPeralatan = false,
  pajakinstalasi,
  pajakinstalasipers,
  pakaipajakinstalasi,
  updated_by,
}) => {
  const useCompanyDefault = gunakanDefaultPajakPeralatan === true;
  const fields = [];
  const values = [];
  const isExist = (v) => v != null;
  if (isExist(diskon)) {
    fields.push("diskon=?");
    values.push(diskon);
  }
  if (isExist(diskoninstalasi)) {
    fields.push("diskoninstalasi=?");
    values.push(diskoninstalasi);
  }
  if (isExist(pajak)) {
    fields.push("pajak=?");
    values.push(toIntegerAmount(pajak));
  }
  if (
    fields.length === 0 &&
    !useCompanyDefault &&
    !isExist(pajakpersen) &&
    !isExist(pajakinstalasi) &&
    !isExist(pajakinstalasipers) &&
    !isExist(pakaipajakinstalasi)
  )
    return Promise.resolve({ affectedRows: 0, message: "No fields to update" });
  return withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT r.id_proyek, r.versi, r.pakaipajakinstalasi,
              r.pajakpersen,
              r.pajakinstalasi,
              r.pajakinstalasipers
       FROM ${table} r WHERE r.id = ? FOR UPDATE`,
      [id],
    );
    if (!rows.length) throw new Error("Rekapitulasi proyek tidak ditemukan.");
    const current = rows[0];
    const equipmentTaxPercent = useCompanyDefault
      ? await getProjectTaxDefaults(conn, current.id_proyek)
      : isExist(pajakpersen)
        ? toRate(pajakpersen)
        : toRate(current.pajakpersen);
    fields.push("pajakpersen=?");
    values.push(equipmentTaxPercent);
    const useInstallationTax = isExist(pakaipajakinstalasi)
      ? Boolean(pakaipajakinstalasi)
      : Boolean(current.pakaipajakinstalasi);
    const installationRate = useInstallationTax
      ? toRate(
          isExist(pajakinstalasipers)
            ? pajakinstalasipers
            : current.pajakinstalasipers,
        )
      : 0;
    fields.push("pajakinstalasi=?");
    values.push(
      useInstallationTax
        ? toIntegerAmount(
            isExist(pajakinstalasi) ? pajakinstalasi : current.pajakinstalasi,
          )
        : 0,
    );
    fields.push("pakaipajakinstalasi=?");
    values.push(useInstallationTax);
    fields.push("pajakinstalasipers=?");
    values.push(installationRate);
    values.push(id);
    const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
    const [result] = await conn.execute(sql, values);
    await recalculateRecapTax(conn, current.id_proyek, current.versi, {
      recalculateEquipment: !isExist(pajak),
      recalculateInstallation: false,
    });
    await invalidateApproval(
      conn,
      current.id_proyek,
      current.versi,
      updated_by,
    );
    return result;
  });
};

const updatekategoriProyek = async ({
  id,
  jenis_proyek,
  updated_by: _updated_by,
}) => {
  const audio = jenis_proyek.includes("audio") ? 1 : 0;
  const cctv = jenis_proyek.includes("cctv") ? 1 : 0;
  const multimedia = jenis_proyek.includes("multimedia") ? 1 : 0;
  const sql = `update ${table} set audio = ${audio}, cctv = ${cctv}, multimedia = ${multimedia} where id=?`;
  const values = [id];
  return withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id_proyek, versi FROM ${table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!rows.length) throw new Error("Rekapitulasi proyek tidak ditemukan.");
    const [result] = await conn.execute(sql, values);
    return result;
  });
};

const destroy = async ({ id, updated_by }) => {
  return withTransaction(pool, async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id_proyek, versi FROM ${table} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!rows.length) return { affectedRows: 0 };
    const [result] = await conn.execute(`DELETE FROM ${table} WHERE id = ?`, [
      id,
    ]);
    await invalidateApproval(
      conn,
      rows[0].id_proyek,
      rows[0].versi,
      updated_by,
    );
    return result;
  });
};

module.exports = {
  list,
  listVersion,
  create,
  createkategoriProyek,
  createNewVersion,
  update,
  updatekategoriProyek,
  destroy,
};
