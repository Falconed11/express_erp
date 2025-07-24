const connection = require("./db");
const table = "rekapitulasiproyek";

const list = ({ id_proyek, versi }) => {
  const sql = `Select r.* From ${table} r left join proyek p on r.id_proyek = p.id where 1=1 ${
    id_proyek ? `and id_proyek=?` : ""
  } and r.versi=?`;
  const values = [];
  values.push(id_proyek ?? undefined);
  values.push(versi);
  return new Promise((resolve, reject) => {
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
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ id_proyek, versi, diskon, diskoninstalasi, pajak }) => {
  const sql = `insert into ${table} (id_proyek, versi, diskon, diskoninstalasi, pajak) values ( ?, ?, ?, ?, ?)`;
  const values = [id_proyek, versi, diskon, diskoninstalasi, pajak];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const createkategoriProyek = ({ id_proyek, versi, jenis_proyek }) => {
  const audio = jenis_proyek.includes("audio") ? 1 : 0;
  const cctv = jenis_proyek.includes("cctv") ? 1 : 0;
  const multimedia = jenis_proyek.includes("multimedia") ? 1 : 0;
  const sql = `insert into ${table} (id_proyek, audio, cctv, multimedia, versi) values ( ?, '${audio}', '${cctv}', '${multimedia}', ?)`;
  const values = [id_proyek, versi];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const createNewVersion = ({ id_proyek, versi }) => {
  const sql = `INSERT INTO ${table} (id_proyek, diskon, pajak, audio, cctv, multimedia, versi) SELECT id_proyek, diskon, pajak, audio, cctv, multimedia, (SELECT max(versi) + 1 from ${table} where id_proyek=?) FROM ${table}
  WHERE id_proyek=? and versi=?`;
  const values = [id_proyek, id_proyek, versi];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, diskon, diskoninstalasi, pajak }) => {
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
    values.push(pajak);
  }
  if (fields.length === 0)
    return Promise.resolve({ affectedRows: 0, message: "No fields to update" });
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const updatekategoriProyek = ({ id, jenis_proyek }) => {
  const audio = jenis_proyek.includes("audio") ? 1 : 0;
  const cctv = jenis_proyek.includes("cctv") ? 1 : 0;
  const multimedia = jenis_proyek.includes("multimedia") ? 1 : 0;
  const sql = `update ${table} set audio = ${audio}, cctv = ${cctv}, multimedia = ${multimedia} where id=?`;
  const values = [id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
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
