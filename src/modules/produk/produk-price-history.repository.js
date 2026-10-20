import database from "../../../repositories/db.2.0.0.cjs";

const { pool } = database;

const list = async ({
  productId,
  search,
  active,
  vendorId,
  dateFrom,
  dateTo,
  page,
  pageSize,
}) => {
  const conditions = ["1 = 1"];
  const values = [];

  if (productId) {
    conditions.push("h.id_produk = ?");
    values.push(productId);
  }
  if (active === "0" || active === "1") {
    conditions.push("h.aktif = ?");
    values.push(active);
  }
  if (vendorId) {
    conditions.push("h.id_vendor = ?");
    values.push(vendorId);
  }
  if (dateFrom) {
    conditions.push("h.tanggal >= ?");
    values.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("h.tanggal <= ?");
    values.push(dateTo);
  }
  if (search) {
    conditions.push(
      `(p.nama LIKE ? OR p.tipe LIKE ? OR p.id_kustom LIKE ? OR v.nama LIKE ? OR c.nama LIKE ?)`,
    );
    const searchValue = `%${search}%`;
    values.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
    );
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM produk_harga_history h
     INNER JOIN produk p ON p.id = h.id_produk
     LEFT JOIN vendor v ON v.id = h.id_vendor
     LEFT JOIN perusahaan c ON c.id = h.id_perusahaan
     ${where}`,
    values,
  );
  const total = Number(countRows[0]?.total ?? 0);
  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const offset = (currentPage - 1) * pageSize;
  const [items] = await pool.execute(
    `SELECT h.*, p.nama AS nama_produk, p.tipe, p.id_kustom,
            v.nama AS nama_vendor, c.nama AS nama_perusahaan,
            k.nama AS created_by_name
     FROM produk_harga_history h
     INNER JOIN produk p ON p.id = h.id_produk
     LEFT JOIN vendor v ON v.id = h.id_vendor
     LEFT JOIN perusahaan c ON c.id = h.id_perusahaan
     LEFT JOIN karyawan k ON k.id = h.created_by
     ${where}
     ORDER BY h.tanggal DESC, h.id DESC
     LIMIT ? OFFSET ?`,
    [...values, pageSize, offset],
  );

  return { items, total, page: currentPage, pageSize, totalPages };
};

const create = async (data) => {
  const [result] = await pool.execute(
    `INSERT INTO produk_harga_history
       (id_produk, id_vendor, id_perusahaan, tanggal, harga, source,
        keterangan, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?)`,
    [
      data.id_produk,
      data.id_vendor,
      data.id_perusahaan,
      data.tanggal,
      data.harga,
      data.keterangan,
      data.created_by,
      data.updated_by,
    ],
  );
  return { id: result.insertId };
};

const getById = async (id) => {
  const [rows] = await pool.execute(
    "SELECT * FROM produk_harga_history WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
};

const update = async (id, data) => {
  const [result] = await pool.execute(
    `UPDATE produk_harga_history
     SET id_produk = ?, id_vendor = ?, id_perusahaan = ?, tanggal = ?,
         harga = ?, keterangan = ?, aktif = ?, updated_by = ?
     WHERE id = ?`,
    [
      data.id_produk,
      data.id_vendor,
      data.id_perusahaan,
      data.tanggal,
      data.harga,
      data.keterangan,
      data.aktif,
      data.updated_by,
      id,
    ],
  );
  return result;
};

export default { list, getById, create, update };
