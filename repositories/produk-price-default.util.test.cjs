const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculatePrice,
  findProductDefault,
  resolveProductPrices,
} = require("./produk-price-default.util.cjs");

const defaults = [
  {
    scope: "global",
    persen_hargajual: 20,
    persen_hargabatas: 10,
  },
  {
    scope: "kategori",
    id_kategori: 2,
    persen_hargajual: 30,
    persen_hargabatas: 15,
  },
  {
    scope: "vendor",
    id_vendor: 4,
    persen_hargajual: 40,
    persen_hargabatas: 20,
  },
  {
    scope: "vendor_kategori",
    id_vendor: 4,
    id_kategori: 2,
    persen_hargajual: 50,
    persen_hargabatas: 25,
  },
];

test("finds the most specific matching default", () => {
  assert.equal(
    findProductDefault(defaults, { main_vendor: 4, id_kategori: 2 }).scope,
    "vendor_kategori",
  );
  assert.equal(
    findProductDefault(defaults, { main_vendor: 4, id_kategori: 3 }).scope,
    "vendor",
  );
  assert.equal(
    findProductDefault(defaults, { main_vendor: 5, id_kategori: 2 }).scope,
    "kategori",
  );
  assert.equal(
    findProductDefault(defaults, { main_vendor: 5, id_kategori: 3 }).scope,
    "global",
  );
});

test("calculates separate prices with ceiling rounding", () => {
  const prices = resolveProductPrices(
    { hargamodal: 101, main_vendor: 4, id_kategori: 2 },
    defaults,
  );
  assert.equal(prices.hargajual, 152);
  assert.equal(prices.hargabatas, 127);
  assert.equal(prices.hargajual_custom, 0);
  assert.equal(prices.hargabatas_custom, 0);
  assert.equal(calculatePrice(100, 12.5), 113);
  assert.equal(calculatePrice(100, 10), 110);
});

test("preserves explicit and existing custom prices independently", () => {
  const prices = resolveProductPrices(
    {
      hargamodal: 100,
      main_vendor: 4,
      id_kategori: 2,
      hargajual: 180,
      hargajual_custom: 1,
      hargabatas_custom: 0,
    },
    defaults,
    {
      hargajual: 175,
      hargajual_custom: 1,
      hargabatas: 120,
      hargabatas_custom: 0,
    },
  );
  assert.equal(prices.hargajual, 180);
  assert.equal(prices.hargajual_custom, 1);
  assert.equal(prices.hargabatas, 125);
  assert.equal(prices.hargabatas_custom, 0);
});

test("clears one custom override and recalculates it", () => {
  const prices = resolveProductPrices(
    {
      hargamodal: 100,
      main_vendor: 4,
      id_kategori: 2,
      hargajual_custom: 0,
    },
    defaults,
    {
      hargajual: 180,
      hargajual_custom: 1,
      hargabatas: 125,
      hargabatas_custom: 0,
    },
  );
  assert.equal(prices.hargajual, 150);
  assert.equal(prices.hargajual_custom, 0);
  assert.equal(prices.hargabatas, 125);
});
