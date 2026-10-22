# Company Tax Defaults and Project Offers

## Purpose

Company tax defaults provide a whole-number percentage for project offers. Each recap stores its own equipment and installation tax rates and amounts. The company default is a starting value; cart changes recalculate amounts from the rates saved on each recap.

## Business Rules

- Tax percentages are integers from 0 through 100 and use unsigned `TINYINT` columns.
- Nominal tax amounts remain integer values in `rekapitulasiproyek.pajak` and `pajakinstalasi`.
- A company may have multiple default records and selects at most one through `perusahaan.id_pajak`; a `NULL` pointer means no current default.
- Changing a default's percentage or changing the company selection does not rewrite saved recap rates. The selected default is used for new recaps and only for existing recaps when explicitly applied in the editor.
- The selected default cannot be deleted. Clear or change the company selection first; unselected historical defaults can be deleted.
- `tanggal_aktif` and `tanggal_kadaluarsa` are optional configuration metadata. When provided, they must be valid dates and `tanggal_kadaluarsa` cannot precede `tanggal_aktif`. They do not select the rate for offers and do not automatically activate/deactivate records.
- Selecting or clearing a default updates the company pointer. The service locks the `perusahaan` row to serialize concurrent changes. The database composite foreign key ensures a company can only select one of its own defaults.
- Mutations to defaults are limited to `owner` and `super`. API reads are scoped to the authenticated user's `id_perusahaan`; never accept a company ID from the request body.
- A new recap snapshots the currently selected company rate for equipment. If no default is selected, the equipment rate is zero.
- Editing an existing recap preserves its saved equipment rate unless the user edits it or selects **Terapkan Default** in the Peralatan section. That action tells the backend to read the current company default when saving.
- Equipment tax can be edited by percentage or nominal amount. The editor stores a whole-number rate; when an amount is entered, it derives the rate by rounding the amount-to-taxable-base percentage. A later cart change recalculates the nominal amount from the saved rate.
- Installation tax is zero unless `pakaipajakinstalasi` is enabled. It has its own saved rate and amount, can be edited independently, and **Terapkan Default** in the Instalasi section applies the company rate while enabling installation tax.
- Changing the company default does not update existing recap rates. Cart changes use the recap's saved rates, not the current company default.
- Discounts stay fixed when cart totals change. For each cart category, the taxable base is `max(0, subtotal - discount)` and the tax amount is `ceil(taxable base * saved rate / 100)`.

## Database

Migration `20261021140000_create_perusahaan_pajak_default.js` creates `perusahaan_pajak_default` with:

- `id_perusahaan`, integer `persen`, `tanggal_aktif`, and `tanggal_kadaluarsa`
- `created_by`, `created_at`, `updated_by`, and `updated_at`
- Foreign keys to `perusahaan` and `karyawan`

It also adds nullable `perusahaan.id_pajak` with a composite foreign key from `(perusahaan.id, perusahaan.id_pajak)` to `(perusahaan_pajak_default.id_perusahaan, perusahaan_pajak_default.id)`. This enforces same-company selection and prevents deleting a selected default. The migration adds `pajakpersen`, `pajakinstalasipers`, and `pakaipajakinstalasi` to `rekapitulasiproyek`. Existing nominal tax amounts are preserved. Existing rates are backfilled from each project's cart subtotal after its discount, rounded to the nearest integer. Existing installation tax amounts above zero set the installation-use flag.

The initial migration has been applied. `20261022000000_allow_nullable_company_tax_dates.js` makes both date columns nullable; its rollback refuses to restore `NOT NULL` while any null dates remain. Use a new timestamped migration for future schema changes, and verify the configured database target before applying migrations.

## API

Mounted after JWT verification at `/api/v2/perusahaan-pajak-default`:

| Method and path         | Behavior                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `GET /`                 | List defaults for the authenticated user's company; `aktif` is derived from `perusahaan.id_pajak` |
| `GET /active`           | Return the selected default, or `null`                                                            |
| `POST /`                | Create an unselected default with integer `persen` and optional dates                             |
| `PATCH /:id`            | Update rate and optional dates; selection is unchanged                                            |
| `PATCH /:id/activate`   | Select this default for the company transactionally                                               |
| `PATCH /:id/deactivate` | Clear the pointer if it currently selects this default                                            |
| `DELETE /:id`           | Delete an unselected default belonging to the authenticated company                               |

The service is `src/modules/perusahaan-pajak-default/perusahaan-pajak-default.service.js`; its router is `src/modules/perusahaan-pajak-default/perusahaan-pajak-default.route.js`. Do not trust a submitted `id_perusahaan`.

## Tax Calculation Flow

### Recap Creation and Editing

1. Creating a recap reads the company's selected rate through `perusahaan.id_pajak`, stores it as `pajakpersen`, and calculates the equipment amount. With no selected default, the equipment rate and amount are zero.
2. Saving an existing recap preserves its stored equipment rate unless `pajakpersen` is manually edited or `gunakanDefaultPajakPeralatan: true` is explicitly submitted. For that explicit action, the backend reads the currently selected company rate rather than trusting a client-supplied default.
3. A recap save can persist a manually entered amount. The editor pairs that amount with a whole-number rate; subsequent cart changes recalculate the amount from that saved rate.
4. Installation has separate `pakaipajakinstalasi`, `pajakinstalasipers`, and `pajakinstalasi` fields. When disabled, the backend forces its rate and amount to zero. When enabled, it uses its own saved/custom rate; the editor's **Terapkan Default** action in the Instalasi section copies the company default and enables installation tax.

### Product and Cart Changes

`repositories/rekapitulasiproyek-pajak.cjs` owns the transaction-required recalculation helper. It locks the recap row, totals cart rows separately for equipment (`instalasi = 0`) and installation (`instalasi = 1`), then calculates:

```text
taxable base = max(0, cart subtotal - saved discount)
tax amount   = ceil(taxable base * recap's saved rate / 100)
```

Equipment uses `rekapitulasiproyek.pajakpersen`. Installation uses `pajakinstalasipers` only when `pakaipajakinstalasi` is enabled. The helper does not read `perusahaan_pajak_default`.

`repositories/keranjangproyek.cjs` calls the helper after cart insert, edit, delete, and bulk sale-price updates, inside the existing transaction. A missing recap row is a no-op. Discounts remain unchanged as cart totals change. Recap version copies preserve both saved rates and the installation-use flag, and the detail page revalidates recap SWR data after cart mutations.

## Frontend Touchpoints

- Company config UI: `next_erp/components/config/PerusahaanPajakDefaults.jsx`, mounted inside `next_erp/app/(default)/config/ui.jsx`.
- Config API client: `next_erp/services/perusahaan-pajak-default.service.js`.
- Recap inputs and snapshot payload: `next_erp/app/(default)/proyek/detail/components/rekapitulasi.jsx`.
- Cart and recap revalidation: `next_erp/app/(default)/proyek/detail/ui.jsx`.

When changing tax behavior, keep the UI, repository validation, saved rate fields, and transaction-level recalculation consistent. In particular, never read the company default during product/cart recalculation; use the recap's saved rate so existing offers retain their snapshot.

## Verification

Focused checks used for this feature:

```sh
npx eslint app.js migrations/20261021140000_create_perusahaan_pajak_default.js migrations/20261022000000_allow_nullable_company_tax_dates.js repositories/rekapitulasiproyek.cjs repositories/keranjangproyek.cjs repositories/rekapitulasiproyek-pajak.cjs src/modules/perusahaan-pajak-default/perusahaan-pajak-default.service.js src/modules/perusahaan-pajak-default/perusahaan-pajak-default.route.js
node --check migrations/20261021140000_create_perusahaan_pajak_default.js
node --check migrations/20261022000000_allow_nullable_company_tax_dates.js
node --check repositories/rekapitulasiproyek.cjs
node --check repositories/keranjangproyek.cjs
node --check repositories/rekapitulasiproyek-pajak.cjs
```

From the `next_erp` root, lint `components/config/PerusahaanPajakDefaults.jsx`, `services/perusahaan-pajak-default.service.js`, and `app/(default)/proyek/detail/components/rekapitulasi.jsx`. Verify the configured database target before applying migrations.
