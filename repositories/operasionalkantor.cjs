const { pool } = require("./db.2.0.0.cjs");
const table = "operasionalkantor";

const list = async ({
  id_karyawan,
  id_kategorioperasionalkantor,
  tanggal,
  start,
  end,
  id_kategori,
  groupbykategori,
}) => {
  const sql = `Select o.*,${
    groupbykategori ? " sum(biaya) totaloperasionalkantor," : ""
  } k.nama karyawan, ko.id id_kategorioperasionalkantor, ko.nama kategori from ${table} o left join karyawan k on o.id_karyawan = k.id left join kategorioperasionalkantor ko on o.id_kategorioperasionalkantor = ko.id where 1=1 ${
    id_karyawan ? `and id_karyawan=?` : ""
  } ${start ? `and tanggal>=?` : ""}
   ${end ? `and tanggal<=?` : ""} ${
    id_kategori ? `and id_kategorioperasionalkantor=?` : ""
  }${groupbykategori ? " group by ko.id" : ""}
  order by${groupbykategori ? " kategori," : ""} o.tanggal desc`;
  const values = [];
  if (id_karyawan) values.push(id_karyawan);
  if (start) values.push(start);
  if (end) values.push(end);
  if (id_kategori) values.push(id_kategori);
  try {
    const [res] = await pool.execute(sql, values);
    console.log(groupbykategori);
    return res;
  } catch (err) {
    console.log(sql);
    console.error("Query error : ", err);
    throw err;
  }
};

const create = ({
  id_karyawan,
  id_kategorioperasionalkantor,
  karyawan,
  kategori,
  biaya = 0,
  tanggal = new Date(),
  keterangan = "",
}) => {
  if (!id_kategorioperasionalkantor && !kategori)
    throw new Error("Kategori operasional kantor wajib diisi!");
  const sql = `insert into ${table} (id_karyawan, id_kategorioperasionalkantor, biaya, tanggal, keterangan) values (${
    karyawan ? `(select id from karyawan where nama=?)` : `?`
  }, ${
    kategori ? `(select id from kategorioperasionalkantor where nama=?)` : `?`
  }, ?, ?, ?)`;
  const values = [
    karyawan ?? id_karyawan,
    kategori ?? id_kategorioperasionalkantor,
    biaya,
    tanggal,
    keterangan,
  ];
  const [res] = pool.execute(sql, values);
  return res;
};

const update = ({
  id,
  id_karyawan,
  id_kategorioperasionalkantor,
  biaya,
  tanggal = new Date(),
  keterangan,
}) => {
  const sql = `update ${table} set id_karyawan = ?, id_kategorioperasionalkantor = ?, biaya = ?, tanggal = ?, keterangan = ? where id = ?`;
  const values = [
    id_karyawan,
    id_kategorioperasionalkantor,
    biaya,
    tanggal,
    keterangan,
    id,
  ];
  const [res] = pool.execute(sql, values);
  return res;
};

const transfer = ({
  id_kategorioperasionalkantor,
  newid_kategorioperasionalkantor,
}) => {
  if (!id_kategorioperasionalkantor) throw new Error("Id lama wajib diisi!");
  if (!newid_kategorioperasionalkantor) throw new Error("Id baru wajib diisi!");
  const sql = `update ${table} set id_kategorioperasionalkantor = ? where id_kategorioperasionalkantor = ?`;
  const values = [
    newid_kategorioperasionalkantor,
    id_kategorioperasionalkantor,
  ];
  const [res] = pool.execute(sql, values);
  return res;
};

const destroy = ({ id }) => {
  const sql = `delete from ${table} where id = ?`;
  const values = [id];
  const [res] = pool.execute(sql, values);
  return res;
};

module.exports = { list, create, update, transfer, destroy };
