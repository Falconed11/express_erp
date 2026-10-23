# Product Price Defaults

## Overview

Product sale price and boundary price can be generated independently from `hargamodal`. Each percentage is a decimal markup from `0.00` through `255.00`, with at most two decimal places. The markup calculation uses `currency.js`; the generated real price remains a whole rupiah value rounded up:

```text
harga = ceil(hargamodal * (1 + persen / 100))
```

For example, a modal of `Rp100.01` with a `12.75%` markup produces `113` after ceiling. The percentage is decimal, but the stored/generated `hargajual` and `hargabatas` values are integers.

The resolver uses the first configured match in this order:

1. `vendor_kategori`: the product's `main_vendor` and category
2. `vendor`: the product's `main_vendor`
3. `kategori`: any vendor with the matching category
4. `global`: fallback for every product

Vendor-scoped defaults are valid only for vendors with `vendor.is_main = 1`. The stock-entry vendor is not used for price resolution.

## Manual Prices

`produk.hargajual_custom` and `produk.hargabatas_custom` are independent flags. A value entered in the product form or supplied in an import is custom. The product form's “Gunakan default” control clears that field's custom flag; the backend then resolves the value from the current modal price and defaults.

The migration marks both prices custom on existing products so deploying defaults does not change historical prices unexpectedly. On a later product update, a custom price remains unchanged unless explicitly replaced or returned to default.

Imports may include optional `hargajual` and `hargabatas` columns. A provided value becomes custom. A blank cell generates a default for new products and clears the corresponding custom flag before recalculating the default for existing products. Exported import sheets include explicit price values only for custom prices.

## Managing Defaults

Owner and super roles can manage all scopes from Config > Default Harga Produk. The backend enforces these permissions on mutations. The global scope is created as a system seed at `0%` for both prices if it does not already exist; its percentages can be edited, but its scope cannot be changed and the row cannot be deleted. The super-only system seed check reports whether this row is valid, and applying seeds restores a missing or inactive row without resetting its percentages. Vendor records have an owner/super-controlled `is_main` marker. A vendor cannot be unmarked or deleted while it has active vendor-scoped defaults; remove those defaults first.

Create a single scope row with both percentage fields:

```http
POST /api/v2/produk-harga-default
Content-Type: application/json

{
  "scope": "vendor_kategori",
  "id_vendor": 12,
  "id_kategori": 4,
  "persen_hargajual": 25,
  "persen_hargabatas": 10
}
```

Supported scopes are `global`, `kategori`, `vendor`, and `vendor_kategori`. Fields not used by a scope must be omitted or null. Percentage fields accept decimal strings with at most two places, for example `12.5` or `12.75`, and must remain within `0.00` through `255.00`. `GET` lists active defaults; `PATCH /:id` updates percentages and scope details except that the global seed must remain global; `DELETE /:id` removes non-global defaults only.

Creating, changing, or deleting a default recalculates active products' non-custom prices in the same transaction. Products are re-resolved after the mutation, so adding a more-specific rule or deleting a rule applies the next effective scope. Recalculation uses each product's current `hargamodal` and updates product audit metadata.

## Product Filters

The product page's custom-price filter uses `GET /api/v2/produk/page` with `customPrice`:

- `jual`: custom sale price
- `batas`: custom boundary price
- `either`: either price is custom
- `none`: both prices use defaults

The default scope table and product/vendor flags are created by migration `20261019090000_add_produk_harga_defaults.js`. Migration `20261020100000_seed_global_produk_harga_default.js` adds the global seed only when missing and preserves any existing global percentages. Migration `20261023170000_allow_decimal_produk_harga_default_percentages.js` changes both percentage columns to `DECIMAL(9,2) UNSIGNED`. Its rollback refuses to run while fractional percentages exist so no precision is silently lost.
