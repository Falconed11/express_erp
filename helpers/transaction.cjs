const withTransaction = async (pool, fn) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
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
    conn.release();
  }
};
module.exports = { withTransaction };
