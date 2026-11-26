const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveProductVendors } = require("./produk-vendor.util.cjs");

test("creates separate main and stock vendors with their own metadata when unlinked", async () => {
  const created = [];
  let nextId = 10;

  const vendors = await resolveProductVendors(
    {
      main_vendor_name: "Main Vendor",
      main_vendor_address: "Main address",
      main_vendor_id_vendor_jenis: 2,
      ikuti_vendor_utama: false,
      vendor: "Stock Vendor",
      alamatVendor: "Stock address",
      id_vendor_jenis: 3,
    },
    async (vendor) => {
      created.push(vendor);
      return nextId++;
    },
  );

  assert.deepEqual(created, [
    {
      nama: "Main Vendor",
      alamat: "Main address",
      id_vendor_jenis: 2,
    },
    {
      nama: "Stock Vendor",
      alamat: "Stock address",
      id_vendor_jenis: 3,
    },
  ]);
  assert.equal(vendors.main_vendor, 10);
  assert.equal(vendors.id_vendor, 11);
});

test("does not fall back to stock metadata for an unlinked new main vendor", async () => {
  const created = [];

  await resolveProductVendors(
    {
      main_vendor_name: "Main Vendor",
      main_vendor_address: "",
      main_vendor_id_vendor_jenis: null,
      ikuti_vendor_utama: false,
      vendor: "Stock Vendor",
      alamatVendor: "Stock address",
      id_vendor_jenis: 3,
    },
    async (vendor) => {
      created.push(vendor);
      return created.length;
    },
  );

  assert.deepEqual(created, [
    { nama: "Main Vendor", alamat: "", id_vendor_jenis: null },
    {
      nama: "Stock Vendor",
      alamat: "Stock address",
      id_vendor_jenis: 3,
    },
  ]);
});

test("uses one newly created main vendor for initial stock when linked", async () => {
  const created = [];

  const vendors = await resolveProductVendors(
    {
      main_vendor_name: "Main Vendor",
      main_vendor_address: "Main address",
      main_vendor_id_vendor_jenis: 2,
      ikuti_vendor_utama: true,
      vendor: "Main Vendor",
      alamatVendor: "Main address",
      id_vendor_jenis: 2,
    },
    async (vendor) => {
      created.push(vendor);
      return 10;
    },
  );

  assert.equal(created.length, 1);
  assert.equal(vendors.main_vendor, 10);
  assert.equal(vendors.id_vendor, 10);
});

test("keeps registered vendor IDs independent or linked according to the setting", async () => {
  const createVendor = async () => {
    throw new Error("Registered vendor IDs should not create new vendors.");
  };
  const unlinked = await resolveProductVendors(
    {
      main_vendor: 10,
      id_vendor: 11,
      ikuti_vendor_utama: false,
    },
    createVendor,
  );
  const linked = await resolveProductVendors(
    {
      main_vendor: 10,
      id_vendor: 11,
      ikuti_vendor_utama: true,
    },
    createVendor,
  );

  assert.equal(unlinked.main_vendor, 10);
  assert.equal(unlinked.id_vendor, 11);
  assert.equal(linked.main_vendor, 10);
  assert.equal(linked.id_vendor, 10);
});

test("keeps explicitly unlinked stock vendor from becoming the main vendor", async () => {
  const vendors = await resolveProductVendors(
    {
      ikuti_vendor_utama: false,
      vendor: "Stock Vendor",
      alamatVendor: "Stock address",
      id_vendor_jenis: 3,
    },
    async () => 11,
  );

  assert.equal(vendors.main_vendor, null);
  assert.equal(vendors.id_vendor, 11);
});

test("preserves legacy behavior when no follow setting is supplied", async () => {
  const vendors = await resolveProductVendors(
    {
      vendor: "Legacy Vendor",
      alamat: "Legacy address",
      id_vendor_jenis: 3,
    },
    async () => 11,
  );

  assert.equal(vendors.main_vendor, 11);
  assert.equal(vendors.id_vendor, 11);
});
