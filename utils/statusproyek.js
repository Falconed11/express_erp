const { pool } = require("./db.2.0.0");
const table = "statusproyek";

const list = async ({ ids }) => {
  const placeholders = ids
    ? " and id in(" + ids.map(() => "?").join(",") + ")"
    : "";
  const sql = `Select * From ${table} where 1=1${placeholders}`;
  const values = [...(ids ? ids : [])];
  const [rows] = await pool.execute(sql, values);
  return rows;
};

module.exports = { list };
