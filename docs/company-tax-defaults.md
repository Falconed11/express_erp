# Company Tax Defaults and Project Offers

## Purpose

Company tax defaults provide a whole-number percentage for project offer tax. Project recaps persist both the nominal tax amount and the percentage used to calculate it. Cart changes recalculate the amount in the backend using the recap's saved percentage.

## Business Rules

- Tax percentages are integers from 0 through 100 and use unsigned `TINYINT` columns.
- Nominal tax amounts remain integer values in `rekapitulasiproyek.pajak` and `pajakinstalasi`.
- A company may have multiple default records, but only one can be active at a time.
- `tanggal_aktif` and `tanggal_kadaluarsa` are validated and retained as configuration metadata. They do not select the rate for offers and do not automatically activate/deactivate records.
- Activating a default deactivates the company's other defaults in the same transaction. The service locks the `perusahaan` row to serialize concurrent activations. Do not bypass this service by directly toggling `aktif`.
- Mutations to defaults are limited to `owner` and `super`. API reads are scoped to the authenticated user's `id_perusahaan`; never accept a company ID from the request body.
- Equipment uses the currently active company rate when a recap is created or manually saved. If no default is active, its rate and amount become zero.
- Installation is zero unless `pakaipajakinstalasi` is enabled. When enabled, its percentage is saved with the recap and its amount is calculated from that rate. The percentage can be customized in the recap editor.
- Existing offers keep their saved rates when the company default changes. Product/cart changes recalculate tax from each recap's saved rate; a manual recap save snapshots the current active equipment rate.
- Discounts stay fixed when cart totals change. A taxable base is `max(0, cart subtotal - discount)` and tax is `ceil(taxable base * rate / 100)`.

## Database

Migration `20261021140000_create_perusahaan_pajak_default.js` creates `perusahaan_pajak_default` with:

- `id_perusahaan`, integer `persen`, `tanggal_aktif`, `tanggal_kadaluarsa`, and `aktif`
- `created_by`, `created_at`, `updated_by`, and `updated_at`
- Foreign keys to `perusahaan` and `karyawan`

The same migration adds `pajakpersen`, `pajakinstalasipers`, and `pakaipajakinstalasi` to `rekapitulasiproyek`. Existing nominal tax amounts are preserved. Existing rates are backfilled from each project's cart subtotal after its discount, rounded to the nearest integer. Existing installation tax amounts above zero set the installation-use flag.

Do not edit this migration after it has been applied. Use a new timestamped migration for future schema changes. Verify the configured database target before applying migrations; this migration has not been run as part of the implementation work.

## API

Mounted after JWT verification at `/api/v2/perusahaan-pajak-default`:

| Method and path         | Behavior                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| `GET /`                 | List defaults for the authenticated user's company                      |
| `GET /active`           | Return that company's active default, or `null`                         |
| `POST /`                | Create an inactive default with integer `persen` and both dates         |
| `PATCH /:id`            | Update rate and dates; active state is unchanged                        |
| `PATCH /:id/activate`   | Deactivate other company defaults and activate this one transactionally |
| `PATCH /:id/deactivate` | Deactivate this company default                                         |
| `DELETE /:id`           | Delete a default belonging to the authenticated user's company          |

The service is `src/modules/perusahaan-pajak-default/perusahaan-pajak-default.service.js`; its router is `src/modules/perusahaan-pajak-default/perusahaan-pajak-default.route.js`. Do not trust a submitted `id_perusahaan`.

## Recap and Cart Flow

- Recap create/update is handled by `repositories/rekapitulasiproyek.cjs`. It looks up the project's company, snapshots the active equipment percentage, validates and saves whole-number rates, and recalculates the equipment amount.
- Installation saves its checkbox, percentage, and amount. If disabled, the backend forces the installation amount and percentage to zero.
- `repositories/rekapitulasiproyek-pajak.cjs` owns the transaction-required tax recalculation helper. It locks the recap row, sums the cart by `instalasi`, and updates amounts from the saved rates and discounts.
- `repositories/keranjangproyek.cjs` calls that helper after insert, update, delete, and bulk sale-price update, inside the existing transaction. A missing recap row is a no-op.
- Recap version copies must preserve both rate columns and `pakaipajakinstalasi`.
- The detail page must revalidate recap SWR data after cart mutations so recalculated amounts appear immediately.

## Frontend Touchpoints

- Company config UI: `next_erp/components/config/PerusahaanPajakDefaults.jsx`, mounted inside `next_erp/app/(default)/config/ui.jsx`.
- Config API client: `next_erp/services/perusahaan-pajak-default.service.js`.
- Recap inputs and snapshot payload: `next_erp/app/(default)/proyek/detail/components/rekapitulasi.jsx`.
- Cart and recap revalidation: `next_erp/app/(default)/proyek/detail/ui.jsx`.

When changing tax behavior, keep the UI, repository validation, saved rate fields, and transaction-level recalculation consistent. In particular, don't recalculate from a currently active company default during cart mutations; use the recap's saved rate so existing offers retain their snapshot.

## Verification

Focused checks used for this feature:

```sh
npx eslint app.js migrations/20261021140000_create_perusahaan_pajak_default.js repositories/rekapitulasiproyek.cjs repositories/keranjangproyek.cjs repositories/rekapitulasiproyek-pajak.cjs src/modules/perusahaan-pajak-default/perusahaan-pajak-default.service.js src/modules/perusahaan-pajak-default/perusahaan-pajak-default.route.js
node --check migrations/20261021140000_create_perusahaan_pajak_default.js
node --check repositories/rekapitulasiproyek.cjs
node --check repositories/keranjangproyek.cjs
node --check repositories/rekapitulasiproyek-pajak.cjs
```

Also lint the changed Next.js config, service, recap, and project detail files from the `next_erp` root. Do not run migrations against an unverified database.

Last conversation:
Yes, perusahaan.id_pajak is likely the cleaner model. It makes the active rate an explicit company-level pointer, so one company can reference only one current rate; the child table can retain all historical rates without an aktif flag that could become inconsistent.

I used an aktif flag because it matched the existing active-record UI pattern, but that requires transaction logic to keep the flags unique. With id_pajak, activation becomes updating one company field. We’d still need to ensure the selected tax record belongs to that same company and prevent deleting the currently referenced record without clearing or replacing it.

I recommend switching to perusahaan.id_pajak and removing the tax record’s aktif column.
