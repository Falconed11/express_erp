const db = require("./db.2.0.0.cjs");
const pool = db.pool;

const table = "bank";

const list = async ({ id }) => {
  const connection = await pool.getConnection();
  try {
    let sql = `select * from ${table} where 1${id ? " and id=?" : ""}`;
    let values = [];
    if (id) values.push(id);
    const [result] = await connection.execute(sql, values);
    return result;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

const create = async ({ nama }) => {
  const connection = await pool.getConnection();
  try {
    let sql = `insert into ${table} (nama) values (?)`;
    let values = [nama];
    const [result] = await connection.execute(sql, values);
    return result;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

const update = async ({ id, nama }) => {
  const connection = await pool.getConnection();
  try {
    let sql = `update ${table} set nama=? where id=?`;
    let values = [nama, id];
    const [result] = await connection.execute(sql, values);
    return result;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

const destroy = async ({ id }) => {
  const connection = await pool.getConnection();
  try {
    let sql = `delete from ${table} where id=?`;
    let values = [id];
    const [result] = await connection.execute(sql, values);
    return result;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { list, create, update, destroy };
