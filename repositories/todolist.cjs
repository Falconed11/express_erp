const { pool } = require("./db.2.0.0.cjs");

const table = "todolist";

const list = async ({ id, id_user }) => {
  const sql = `select t.*, s.status from ${table} t
  left join statustodolist s on s.id=t.id_status
  where 1=1${id ? " and id=?" : ""}${id_user ? " and id_user=?" : ""}
  order by deadlinedate`;
  const values = [...(id ? [id] : []), ...(id_user ? [id_user] : [])];
  console.log({ sql, values });
  const [rows] = await pool.execute(sql, values);
  return rows;
};

const error = new Error("Kegiatan wajib diisi!");

/**
 * @returns {Promise<number>}
 */
const insertTodoList = async ({
  id_user = null,
  id_karyawan = null,
  kegiatan,
  keterangan = "",
  deadlinedate = new Date(),
  id_status = null,
}) => {
  if (!kegiatan) throw error;
  const sql = `insert into ${table} (id_user, id_karyawan, kegiatan, keterangan, deadlinedate, id_status) values (?,?,?,?,?,?)`;
  const values = [
    id_user,
    id_karyawan,
    kegiatan,
    keterangan,
    deadlinedate,
    id_status,
  ];
  const [rows] = await pool.execute(sql, values);
  return rows.insertId;
};

const create = async (rest) => {
  try {
    const res = await insertTodoList(rest);
    console.log("Data created successfuly.");
    return res;
  } catch (err) {
    console.error("Error : ", err);
    return err;
  }
};

const update = async ({ id, ...rest }) => {
  if (id == null) throw new Error("Id tidak valid");
  const allowedFields = [
    "id_user",
    "id_karyawan",
    "kegiatan",
    "keterangan",
    "deadlinedate",
    "id_status",
  ];
  const fields = [],
    values = [];
  for (const [key, value] of Object.entries(rest)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key}=?`);
      values.push(value);
    }
  }
  if (fields.length === 0)
    return { affectedRows: 0, message: "No fields to update" };
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(", ")} WHERE id = ?`;
  const [result] = await pool.execute(sql, values);
  return result;
};

const destroy = async ({ id }) => {
  const sql = `delete from ${table} where id =?`;
  const values = [id];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list, create, insertTodoList, update, destroy };
