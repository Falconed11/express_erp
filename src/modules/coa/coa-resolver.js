export const resolveCoaType = async (data, conn) => {
  if (data.id_coa_type) {
    const [rows] = await conn.execute(
      "SELECT id FROM coa_type WHERE id = ? LIMIT 1",
      [data.id_coa_type],
    );
    if (rows[0]) return rows[0].id;
  }
  if (!data.coa_type) {
    throw new Error("Tipe COA wajib diisi.");
  }

  const [existingRows] = await conn.execute(
    "SELECT id FROM coa_type WHERE nama = ? LIMIT 1",
    [data.coa_type],
  );
  if (existingRows[0]) return existingRows[0].id;

  const normalBalance = data.normal_balance ?? 0;
  if (![0, 1, "0", "1"].includes(normalBalance)) {
    throw new Error("Saldo normal harus bernilai 0 atau 1.");
  }
  const [result] = await conn.execute(
    "INSERT INTO coa_type (nama, normal_balance, created_by) VALUES (?, ?, ?)",
    [data.coa_type, normalBalance, data.created_by ?? null],
  );
  return result.insertId;
};

export const resolveCoaSubtype = async (data, idCoaType, conn) => {
  if (data.id_coa_subtype) {
    const [rows] = await conn.execute(
      "SELECT id, id_coa_type FROM coa_subtype WHERE id = ? LIMIT 1",
      [data.id_coa_subtype],
    );
    if (rows[0]) {
      if (Number(rows[0].id_coa_type) !== Number(idCoaType)) {
        throw new Error("Sub Tipe COA tidak sesuai dengan Tipe COA.");
      }
      return rows[0].id;
    }
  }
  if (!data.coa_subtype) {
    throw new Error("Sub Tipe COA wajib diisi.");
  }

  const [existingRows] = await conn.execute(
    "SELECT id, id_coa_type FROM coa_subtype WHERE nama = ? LIMIT 1",
    [data.coa_subtype],
  );
  const existingSubtype = existingRows[0];
  if (existingSubtype) {
    if (Number(existingSubtype.id_coa_type) !== Number(idCoaType)) {
      throw new Error(
        `Sub Tipe COA ${data.coa_subtype} sudah terdaftar pada Tipe COA lain.`,
      );
    }
    return existingSubtype.id;
  }

  const [result] = await conn.execute(
    "INSERT INTO coa_subtype (nama, id_coa_type, created_by) VALUES (?, ?, ?)",
    [data.coa_subtype, idCoaType, data.created_by ?? null],
  );
  return result.insertId;
};
