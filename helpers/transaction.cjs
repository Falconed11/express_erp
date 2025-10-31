const withTransaction = async (pool, fn) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    conn.__inTransaction = true;
    // Run the caller’s function with this transaction connection
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    const rollbackMessage = "Transaction rolled back due to error:";
    console.error(rollbackMessage, err);
    throw new Error(rollbackMessage + " " + err.message);
  } finally {
    conn.__inTransaction = false;
    conn.release();
  }
};
const assertTransaction = (conn, operation = "Operation") => {
  if (!conn || !conn.__inTransaction)
    throw new Error(
      `${operation}() must be called inside transaction. Set conn.__inTransaction to true after transaction begin.`
    );
};
module.exports = { withTransaction, assertTransaction };
