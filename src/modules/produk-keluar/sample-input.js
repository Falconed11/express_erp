const sampleInput = {
  date: "2026-09-18",
  productId: 1,
  stockOut: [
    {
      stockInId: 1,
      quantity: 1,
    },
    {
      stockInId: 2,
      quantity: 1,
    },
  ],
};
// POST /api/v2/produk-keluar
// `created_by` is deliberately omitted: it is taken from the verified JWT.
export default {
  productExpenses: [
    {
      id_produk: 42,
      id_proyek: 7,
      tanggal: "2026-09-18",
      keterangan: "Material untuk operasional produksi",
      // `jumlah` must equal the total allocation below.
      jumlah: 5,
      produkmasuk: [
        { id_produkmasuk: 101, jumlah: 3 },
        { id_produkmasuk: 102, jumlah: 2 },
      ],
    },
  ],
};
