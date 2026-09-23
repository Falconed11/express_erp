const connection = require("./db.cjs");

const table = "metodepembayaran";

const requireCompany = (companyId) => {
  if (companyId) return;
  const error = new Error("Perusahaan login tidak ditemukan.");
  error.statusCode = 400;
  throw error;
};

const listSumberDanaConfig = ({
  id_perusahaan,
  id_coa_type,
  id_coa_subtype,
  aktif,
  limit,
  offset,
}) => {
  const filters = ["c.id_perusahaan = ?"];
  const values = [id_perusahaan];
  if (id_coa_type) {
    filters.push("ct.id = ?");
    values.push(id_coa_type);
  }
  if (id_coa_subtype) {
    filters.push("cs.id = ?");
    values.push(id_coa_subtype);
  }
  if (aktif != null) {
    filters.push("c.aktif = ?");
    values.push(aktif);
  }
  const coaWhere = filters.join(" AND ");

  const sql = `
    SELECT
      c.id id,
      c.id id_coa,
      mp.id id_metodepembayaran,
      c.nama nama,
      c.nama coa,
      c.aktif,
      c.keterangan,
      c.id_perusahaan,
      c.id_coa_subtype,
      ct.id id_coa_type,
      ct.normal_balance,
      ct.nama coa_type,
      cs.nama coa_subtype,
      mp.nama sumber_dana,
      mp.atasnama,
      mp.id_bank,
      b.nama bank,
      b.nama bank_sumber_dana,
      mp.norekening,
      'coa' row_type,
      COUNT(*) OVER() total
    FROM coa c
    LEFT JOIN metodepembayaran mp ON mp.id_coa = c.id
      AND mp.id_perusahaan = c.id_perusahaan
    LEFT JOIN bank b ON b.id = mp.id_bank
    LEFT JOIN coa_subtype cs ON cs.id = c.id_coa_subtype
    LEFT JOIN coa_type ct ON ct.id = cs.id_coa_type
    WHERE ${coaWhere}
    ORDER BY nama
    ${limit != null && offset != null ? "LIMIT ? OFFSET ?" : ""}`;
  const paginationValues =
    limit != null && offset != null ? [Number(limit), Number(offset)] : [];

  return new Promise((resolve, reject) => {
    connection.query(sql, [...values, ...paginationValues], (err, res) => {
      if (err) return reject(err);
      resolve(res || []);
    });
  });
};

const list = ({
  id,
  hide,
  id_perusahaan,
  id_coa,
  unconnected,
  config_sumber_dana,
  id_coa_type,
  id_coa_subtype,
  aktif,
  limit,
  offset,
}) => {
  requireCompany(id_perusahaan);
  if (config_sumber_dana) {
    return listSumberDanaConfig({
      id_perusahaan,
      id_coa_type,
      id_coa_subtype,
      aktif,
      limit,
      offset,
    });
  }
  const sql = `select b.nama namabank, p.nama perusahaan, mp.*, t.t total, c.nama coa from ${table} mp 
  left join (select mp.id, mp.nama, sum(pp.nominal) t from pembayaranproyek pp left join metodepembayaran mp on 
    pp.id_metodepembayaran=mp.id group by mp.id) t on mp.id=t.id 
  left join bank b on b.id=mp.id_bank 
  left join perusahaan p on p.id=mp.id_perusahaan
  left join coa c on c.id=mp.id_coa
  where 1=1 
  ${hide != null ? "and hide=?" : ""} 
  ${id ? "and mp.id=?" : ""}
  ${id_coa ? "and mp.id_coa=?" : ""}
  ${unconnected ? "and mp.id_coa is null" : ""}
  ${id_perusahaan ? "and mp.id_perusahaan=?" : ""} order by mp.nama
  `;
  const values = [
    ...(hide != null ? [hide] : []),
    ...(id ? [id] : []),
    ...(id_coa ? [id_coa] : []),
    ...(id_perusahaan ? [id_perusahaan] : []),
  ];
  // console.log(sql, values);
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

const transferBank = ({ src, dst, companyId }) => {
  requireCompany(companyId);
  const sql = `update pembayaranproyek pp
    join metodepembayaran source on source.id = pp.id_metodepembayaran
    join metodepembayaran target on target.id = ?
    set pp.id_metodepembayaran=?
    where pp.id_metodepembayaran=?
      and source.id_perusahaan=?
      and target.id_perusahaan=?`;
  const values = [dst, dst, src, companyId, companyId];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const create = ({
  nama,
  id_bank,
  norekening,
  atasnama,
  id_perusahaan,
  id_coa,
  companyId,
}) => {
  requireCompany(companyId);
  return new Promise((resolve, reject) => {
    connection.query(
      `select id from ${table} where id_coa=? and id_perusahaan=? limit 1`,
      [id_coa, companyId],
      (err, rows) => {
        if (err) return reject(err);
        if (rows?.[0])
          return reject(
            new Error("COA sudah terhubung ke metode pembayaran lain."),
          );
        const sql = `insert into ${table} (nama,id_bank,norekening,atasnama,id_perusahaan,id_coa) values (?,?,?,?,?,?)`;
        const values = [nama, id_bank, norekening, atasnama, companyId, id_coa];
        connection.query(sql, values, (insertError, res) => {
          if (insertError) return reject(insertError);
          resolve(res);
        });
      },
    );
  });
};

const hasOtherCoaLink = (id, idCoa, companyId) =>
  new Promise((resolve, reject) => {
    connection.query(
      `select id from ${table} where id_coa=? and id_perusahaan=? and id<>? limit 1`,
      [idCoa, companyId, id],
      (err, rows) => {
        if (err) return reject(err);
        resolve(Boolean(rows?.[0]));
      },
    );
  });

const updateWithValidation = async ({ id, companyId, ...rest }) => {
  requireCompany(companyId);
  if (
    rest.id_coa != null &&
    (await hasOtherCoaLink(id, rest.id_coa, companyId))
  ) {
    throw new Error("COA sudah terhubung ke metode pembayaran lain.");
  }
  return update({ id, companyId, ...rest });
};

const update = ({ id, companyId, ...rest }) => {
  requireCompany(companyId);
  const allowedFields = [
    "nama",
    "id_bank",
    "norekening",
    "atasnama",
    "hide",
    "id_coa",
  ];
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(rest)) {
    if (allowedFields.includes(key) && (value != null || key === "id_coa")) {
      fields.push(`${key}=?`);
      values.push(value);
    }
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `update ${table} set ${fields.join(", ")} where id=? and id_perusahaan=?`;
  values.push(companyId);
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

const destroy = ({ id, companyId }) => {
  requireCompany(companyId);
  const sql = `delete from ${table} where id = ? and id_perusahaan = ?`;
  const values = [id, companyId];
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  });
};

module.exports = {
  list,
  create,
  update: updateWithValidation,
  destroy,
  total,
  transferBank,
};
