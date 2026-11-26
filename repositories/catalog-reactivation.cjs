const activateMatchingInactiveCatalogEntry = async ({
  conn,
  table,
  name,
  label,
  allowReactivate = false,
}) => {
  const [rows] = await conn.execute(
    `SELECT id FROM ${table} WHERE nama = ? AND aktif = 0 LIMIT 1`,
    [name],
  );
  const inactiveEntry = rows[0];
  if (!inactiveEntry) return null;

  if (!allowReactivate) {
    const error = new Error(
      `${label} ini sudah ada dalam status nonaktif. Hanya owner atau super yang dapat mengaktifkannya.`,
    );
    error.statusCode = 403;
    throw error;
  }

  await conn.execute(`UPDATE ${table} SET aktif = 1 WHERE id = ?`, [
    inactiveEntry.id,
  ]);
  return inactiveEntry.id;
};

module.exports = { activateMatchingInactiveCatalogEntry };
