import db from "../../config/db.js";
import productStockRepository from "./produk-stock.repository.cjs";

const Model = {
  async listUnclaimedEntries({
    page = 1,
    pageSize = 25,
    includeInactive = "false",
  } = {}) {
    const requestedPage = Number(page);
    const requestedPageSize = Number(pageSize);
    if (!Number.isInteger(requestedPage) || requestedPage < 1) {
      const error = new Error("Nomor halaman tidak valid.");
      error.statusCode = 400;
      throw error;
    }
    if (
      !Number.isInteger(requestedPageSize) ||
      requestedPageSize < 1 ||
      requestedPageSize > 100
    ) {
      const error = new Error("Jumlah baris per halaman tidak valid.");
      error.statusCode = 400;
      throw error;
    }
    if (includeInactive !== "true" && includeInactive !== "false") {
      const error = new Error("Filter data non aktif tidak valid.");
      error.statusCode = 400;
      throw error;
    }

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM produkmasuk pm
       LEFT JOIN produk p ON p.id = pm.id_produk
       WHERE pm.id_perusahaan IS NULL
       AND (? = 1 OR p.aktif = 1)`,
      [includeInactive === "true" ? 1 : 0],
    );
    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / requestedPageSize);
    const currentPage = Math.min(requestedPage, Math.max(totalPages, 1));
    const offset = (currentPage - 1) * requestedPageSize;
    const [items] = await db.execute(
      `SELECT
         pm.id,
         pm.id_produk,
         pm.id_vendor,
         pm.jumlah,
         pm.keluar,
         pm.harga,
         pm.tanggal,
         pm.pinjaman,
         p.id_kustom,
         p.nama,
         p.aktif,
         p.tipe,
         p.satuan,
         brand.nama AS merek,
         vendor.nama AS vendor
       FROM produkmasuk pm
       LEFT JOIN produk p ON p.id = pm.id_produk
       LEFT JOIN merek brand ON brand.id = p.id_merek
       LEFT JOIN vendor ON vendor.id = pm.id_vendor
       WHERE pm.id_perusahaan IS NULL
       AND (? = 1 OR p.aktif = 1)
       ORDER BY pm.tanggal DESC, pm.id DESC
       LIMIT ? OFFSET ?`,
      [includeInactive === "true" ? 1 : 0, requestedPageSize, offset],
    );

    return {
      items,
      total,
      page: currentPage,
      pageSize: requestedPageSize,
      totalPages,
    };
  },
  claimUnclaimedEntry(data) {
    return productStockRepository.claimUnclaimedEntry(data);
  },
  async listLoans(idPerusahaan) {
    if (!Number.isInteger(Number(idPerusahaan)) || Number(idPerusahaan) <= 0)
      throw new Error("Perusahaan pengguna tidak valid.");
    const [rows] = await db.execute(`
      SELECT
        loan.id,
        loan.id_produk,
        loan.id_produkmasuk,
        loan.id_produkkeluar,
        loan.id_perusahaan_pemberi,
        lender.nama AS perusahaan_pemberi,
        loan.jumlah,
        COALESCE(returns.jumlah_dikembalikan, 0) AS jumlah_dikembalikan,
        loan.jumlah - COALESCE(returns.jumlah_dikembalikan, 0) AS sisa_pinjaman,
        loan.id_produkmasuk_peminjam,
        source.harga AS harga_asal,
        outflow.tanggal,
        outflow.metodepengeluaran,
        product.nama AS nama,
        product.id_kustom,
        product.tipe,
        product.satuan,
        brand.nama AS merek,
        project.nama AS nama_proyek,
        journal.keterangan AS keterangan_jurnal,
        outflow.keterangan
      FROM produkpinjaman loan
      INNER JOIN produkmasuk source
        ON source.id = loan.id_produkmasuk
      INNER JOIN perusahaan lender
        ON lender.id = loan.id_perusahaan_pemberi
      INNER JOIN produk product ON product.id = loan.id_produk
      LEFT JOIN merek brand ON brand.id = product.id_merek
      INNER JOIN produkkeluar outflow ON outflow.id = loan.id_produkkeluar
      LEFT JOIN proyek project ON project.id = outflow.id_proyek
      LEFT JOIN jurnal journal ON journal.id = outflow.id_jurnal
      LEFT JOIN (
        SELECT id_produkpinjaman, SUM(jumlah) AS jumlah_dikembalikan
        FROM produkpinjamanpengembalian
        GROUP BY id_produkpinjaman
      ) returns ON returns.id_produkpinjaman = loan.id
      WHERE loan.id_perusahaan_peminjam = ?
      ORDER BY outflow.tanggal DESC, loan.id DESC
    `, [idPerusahaan]);
    const [returnRows] = await db.execute(
      `SELECT returned.id,
              returned.id_produkpinjaman,
              returned.jumlah,
              returned.tanggal
       FROM produkpinjamanpengembalian returned
       INNER JOIN produkpinjaman loan
         ON loan.id = returned.id_produkpinjaman
       WHERE loan.id_perusahaan_peminjam = ?
       ORDER BY returned.tanggal DESC, returned.id DESC`,
      [idPerusahaan],
    );
    const returnsByLoan = new Map();
    for (const returned of returnRows) {
      const loanId = String(returned.id_produkpinjaman);
      const loanReturns = returnsByLoan.get(loanId) ?? [];
      loanReturns.push(returned);
      returnsByLoan.set(loanId, loanReturns);
    }
    for (const loan of rows) {
      loan.pengembalian = returnsByLoan.get(String(loan.id)) ?? [];
    }
    return rows;
  },
};

export default Model;
