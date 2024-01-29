const connection = require("./db");
const table = "rekapitulasiproyek";

const list = ({ id_proyek, versi }) => {
  const sql = `Select r.* From ${table} r left join proyek p on r.id_proyek = p.id where 1=1 ${
    id_proyek ? `and id_proyek=${id_proyek}` : ""
  } and versi=${versi}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const listVersion = ({ id_proyek }) => {
  const sql = `select distinct versi from ${table} where 1=1 ${
    id_proyek ? `and id_proyek=${id_proyek}` : ""
  }`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (!res) res = [];
      resolve(res);
    });
  });
};

const create = ({ id_proyek, versi, diskon, pajak }) => {
  const sql = `insert into ${table} (id_proyek, versi, diskon, pajak) values ( '${id_proyek}', '${versi}', '${diskon}', '${pajak}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const createJenisProyek = ({ id_proyek, versi, jenis_proyek }) => {
  const audio = jenis_proyek.includes("audio") ? 1 : 0;
  const cctv = jenis_proyek.includes("cctv") ? 1 : 0;
  const multimedia = jenis_proyek.includes("multimedia") ? 1 : 0;
  const sql = `insert into ${table} (id_proyek, audio, cctv, multimedia, versi) values ( '${id_proyek}', '${audio}', '${cctv}', '${multimedia}', '${versi}')`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const createNewVersion = ({ id_proyek, versi }) => {
  const sql = `INSERT INTO ${table} (id_proyek, diskon, pajak, audio, cctv, multimedia, versi) SELECT id_proyek, diskon, pajak, audio, cctv, multimedia, (SELECT max(versi) + 1 from ${table} where id_proyek=${id_proyek}) FROM ${table}
  WHERE id_proyek=${id_proyek} and versi=${versi}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, diskon, pajak }) => {
  const sql = `update ${table} set diskon = ${diskon}, pajak = ${pajak} where id=${id}`;
  console.log(sql);
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const updateJenisProyek = ({ id, jenis_proyek }) => {
  const audio = jenis_proyek.includes("audio") ? 1 : 0;
  const cctv = jenis_proyek.includes("cctv") ? 1 : 0;
  const multimedia = jenis_proyek.includes("multimedia") ? 1 : 0;
  const sql = `update ${table} set audio = ${audio}, cctv = ${cctv}, multimedia = ${multimedia} where id=${id}`;
  console.log(sql);
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ${id}`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = {
  list,
  listVersion,
  create,
  createJenisProyek,
  createNewVersion,
  update,
  updateJenisProyek,
  destroy,
};
