// POST /api/v2/produk-keluar
// `created_by` is deliberately omitted: it is taken from the verified JWT.
const sampleInput = {
  projectId: 7,
  desc: "Material untuk operasional produksi",
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

export default sampleInput;
