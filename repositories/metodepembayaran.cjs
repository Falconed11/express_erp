const connection = require("./db.cjs");

const table = "metodepembayaran";

const list = ({ id, hide, id_perusahaan }) => {
  const sql = `select b.nama namabank, p.nama perusahaan, p.id id_perusahaan, mp.id, mp.*, t.t total, c.nama coa from ${table} mp 
  left join (select mp.id, mp.nama, sum(pp.nominal) t from pembayaranproyek pp left join metodepembayaran mp on 
    pp.id_metodepembayaran=mp.id group by mp.id) t on mp.id=t.id 
  left join bank b on b.id=mp.id_bank 
  left join perusahaan p on p.id=mp.id_perusahaan
  left join coa c on c.id=mp.id_coa
  where 1=1 
  ${hide != null ? "and hide=?" : ""} 
  ${id ? "and mp.id=?" : ""}
  ${id_perusahaan ? "and mp.id_perusahaan=?" : ""} order by mp.nama
  `;
  const values = [
    ...(id ? [id] : []),
    ...(hide != null ? [hide] : []),
    ...(id_perusahaan != null ? [id_perusahaan] : []),
  ];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const total = () => {
  const sql = `select mp.id, mp.nama, sum(pp.nominal) total from pembayaranproyek pp left join metodepembayaran mp on pp.id_metodepembayaran=mp.id group by mp.id order by mp.nama`;
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) reject(err);
      if (!res) res = [];
      resolve(res);
    });
  });
};

const transferBank = ({ src, dst }) => {
  const sql =
    "update pembayaranproyek set id_metodepembayaran=? where id_metodepembayaran=?";
  const values = [dst, src];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const create = ({ nama, id_bank, norekening, atasnama, id_coa }) => {
  const sql = `insert into ${table} (nama,id_bank,norekening,atasnama) values (?,?,?,?,?)`;
  const values = [nama, id_bank, norekening, atasnama, id_coa];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const update = ({ id, ...rest }) => {
  const allowedFields = [
    "nama",
    "id_perusahaan",
    "id_bank",
    "norekening",
    "atasnama",
    "hide",
    "id_coa",
  ];
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(rest)) {
    if (allowedFields.includes(key) && value != null) {
      fields.push(`${key}=?`);
      values.push(value);
    }
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `update ${table} set ${fields.join(", ")} where id=?`;
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = { list, create, update, destroy, total, transferBank };
