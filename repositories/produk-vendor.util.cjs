const normalizeId = (id) => (id == null || id === "" ? null : id);

const resolveProductVendors = async (
  {
    id_vendor = null,
    vendor = "",
    main_vendor = null,
    main_vendor_name = "",
    main_vendor_address,
    main_vendor_id_vendor_jenis,
    ikuti_vendor_utama,
    alamatVendor,
    alamat = "",
    id_vendor_jenis = null,
  },
  createVendor,
) => {
  let stockVendorId = normalizeId(id_vendor);
  let mainVendorId = normalizeId(main_vendor);
  let mainVendorInsertId = null;
  let stockVendorInsertId = null;
  const mainVendorName =
    typeof main_vendor_name === "string" ? main_vendor_name.trim() : "";
  const stockVendorName = typeof vendor === "string" ? vendor.trim() : "";
  const followsMainVendor = [true, 1, "1"].includes(ikuti_vendor_utama);
  const hasExplicitFollowSetting = ikuti_vendor_utama != null;

  if (mainVendorId == null && mainVendorName) {
    const mainVendorAddress =
      main_vendor_address !== undefined
        ? (main_vendor_address ?? "")
        : alamat;
    const mainVendorType =
      main_vendor_id_vendor_jenis !== undefined
        ? main_vendor_id_vendor_jenis
        : id_vendor_jenis;
    mainVendorInsertId = await createVendor({
      nama: mainVendorName,
      alamat: mainVendorAddress,
      id_vendor_jenis: mainVendorType,
    });
    mainVendorId = mainVendorInsertId;
  }

  if (followsMainVendor && mainVendorId != null) {
    stockVendorId = mainVendorId;
  } else if (stockVendorId == null && stockVendorName) {
    stockVendorInsertId = await createVendor({
      nama: stockVendorName,
      alamat: alamatVendor ?? alamat,
      id_vendor_jenis,
    });
    stockVendorId = stockVendorInsertId;
  }

  if (
    mainVendorId == null &&
    stockVendorId != null &&
    (!hasExplicitFollowSetting || followsMainVendor)
  ) {
    mainVendorId = stockVendorId;
  }

  if (followsMainVendor && mainVendorId != null) {
    stockVendorId = mainVendorId;
  }

  return {
    main_vendor: mainVendorId,
    id_vendor: stockVendorId,
    mainVendorInsertId,
    stockVendorInsertId,
  };
};

module.exports = { resolveProductVendors };
