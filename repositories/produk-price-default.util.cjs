const DEFAULT_SCOPES = ["vendor_kategori", "vendor", "kategori", "global"];

const isEnabled = (value) => value === true || value === 1 || value === "1";

const findProductDefault = (defaults, { main_vendor, id_kategori }) => {
  const vendorId = main_vendor == null ? null : String(main_vendor);
  const categoryId = id_kategori == null ? null : String(id_kategori);
  for (const scope of DEFAULT_SCOPES) {
    const match = defaults.find((item) => {
      if (item.scope !== scope) return false;
      if (scope === "global") return true;
      if (scope === "kategori")
        return categoryId != null && String(item.id_kategori) === categoryId;
      if (scope === "vendor")
        return vendorId != null && String(item.id_vendor) === vendorId;
      return (
        vendorId != null &&
        categoryId != null &&
        String(item.id_vendor) === vendorId &&
        String(item.id_kategori) === categoryId
      );
    });
    if (match) return match;
  }
  return null;
};

const calculatePrice = (modalPrice, percent) => {
  const currency = require("currency.js");
  const modal = currency(modalPrice, { precision: 6 });
  const markup = currency(percent, { precision: 6 });
  if (!Number.isFinite(modal.value) || !Number.isFinite(markup.value))
    return null;

  const price = modal.multiply(
    currency(1, { precision: 6 }).add(markup.divide(100)),
  );
  return Math.ceil(price.value);
};

const resolveOnePrice = ({
  field,
  customField,
  percentField,
  product,
  existing,
  defaultRow,
  isCreate,
}) => {
  const hasPrice =
    Object.hasOwn(product, field) && product[field] !== undefined;
  const hasCustom =
    Object.hasOwn(product, customField) && product[customField] !== undefined;
  const custom = hasCustom
    ? isEnabled(product[customField])
    : hasPrice || (!isCreate && isEnabled(existing?.[customField]));

  if (custom) {
    return {
      value: hasPrice ? product[field] : (existing?.[field] ?? null),
      custom: 1,
    };
  }

  const generated = defaultRow
    ? calculatePrice(product.hargamodal, defaultRow[percentField])
    : null;
  if (generated !== null) return { value: generated, custom: 0 };

  return {
    value: hasPrice
      ? product[field]
      : (existing?.[field] ?? (isCreate && field === "hargajual" ? 0 : null)),
    custom: 0,
  };
};

const resolveProductPrices = (product, defaults, existing = null) => {
  const defaultRow = findProductDefault(defaults, product);
  const isCreate = existing == null;
  const jual = resolveOnePrice({
    field: "hargajual",
    customField: "hargajual_custom",
    percentField: "persen_hargajual",
    product,
    existing,
    defaultRow,
    isCreate,
  });
  const batas = resolveOnePrice({
    field: "hargabatas",
    customField: "hargabatas_custom",
    percentField: "persen_hargabatas",
    product,
    existing,
    defaultRow,
    isCreate,
  });

  return {
    hargajual: jual.value,
    hargajual_custom: jual.custom,
    hargabatas: batas.value,
    hargabatas_custom: batas.custom,
  };
};

module.exports = {
  DEFAULT_SCOPES,
  calculatePrice,
  findProductDefault,
  resolveProductPrices,
};
