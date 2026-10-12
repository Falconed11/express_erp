This is the Express ERP backend.

Follow existing patterns and keep changes minimal.

## Workspace Stack

This workspace contains a paired ERP system:

- `express_erp` is the backend: Node.js ESM, Express 4, JWT authentication, bcrypt, Multer, and Knex.
- `next_erp` is the frontend: Next.js 16, React 19, HeroUI, Tailwind CSS, SWR, and mixed JavaScript/TypeScript.
- MariaDB is the primary database, accessed through the MySQL-compatible `mysql2` driver and managed with Knex migrations.

Keep API changes compatible with the Next.js frontend, its existing data-fetching conventions, and both legacy routes and `/api/v2` modular routes.

## Conflict Resolution

- If the user's request conflicts with existing code, project conventions, documentation, or another instruction, stop and ask the user before making changes.
- Do not silently choose one conflicting requirement or rewrite existing behavior to resolve the conflict.
- Explain the conflict briefly and identify the relevant files or rules before asking.

## Architecture

- Follow Clean Architecture principles for all new code and modifications: keep concerns separated, make dependencies explicit, and decouple domain logic from external frameworks and UI.
- Prioritize maintainability for human developers. Prefer readable, idiomatic, testable code over clever or overly compact syntax.
- `app.js` is the application entry point. Use it for middleware and route registration.
- Legacy CRUD exists in `repositories/*.cjs` and older handlers in `app.js`.
- New code belongs under `src/`.
- `src/modules` is the latest preferred CRUD structure. Prefer it for new resources.
- Use `src/modules/default` for simple standard CRUD.
- Use a more specialized module under `src/modules` when the resource has custom business logic.
- Use the older `src/routes`, `src/controllers`, `src/services`, and `src/models` structure only when extending an existing resource that already follows it.
- Do not add new business logic directly to `app.js` unless it is route registration or application middleware.

## Legacy Code Handling

- Preserve existing legacy code as-is by default to avoid unintended side effects and regression bugs.
- Refactor or update legacy code only when the task explicitly requires changes to that module, the change can be safely verified and tested without risking system stability, and the result aligns with the Clean Architecture guidelines above.

## Database and migrations

- Always use Knex migrations for database schema changes.
- Use a new timestamped migration for every schema change. Do not edit migrations that may already have run.
- Follow the existing database naming conventions and provide rollback logic where practical.
- Migration changes include tables, columns, indexes, foreign keys, constraints, and column types.
- New application tables should normally include the standard audit columns: `aktif`, `created_at`, `created_by`, `updated_at`, and `updated_by`.
- `aktif` should default to `true`; timestamp columns should default to the current time where appropriate.
- `created_by` and `updated_by` should normally be nullable foreign keys to `karyawan.id`, using the existing foreign-key naming and update conventions.
- Check existing migrations and the target table before adding audit columns; do not duplicate columns or impose them on tables whose established design intentionally differs.
- Schema migrations are separate from normal application CRUD operations.
- Use transactions for multi-table writes, financial operations, stock changes, and duplication workflows.
- Use parameterized queries or the Knex query builder. Never interpolate user-controlled values into SQL.

## Produk Masuk and Jurnal Flow

- The legacy `/api/produkmasuk` handlers are registered in `app.js` and delegate to `repositories/produkmasuk.cjs` for list/create/update/delete. The V2 stock-entry creation route is `/api/v2/produk-stock/entries` and is handled by `src/modules/produk-stock`.
- `repositories/produkmasuk.cjs` owns stock-in quantity, vendor, price, dates, company stock, and product stock changes. Keep those updates in one transaction. Editing quantity must not reduce it below `keluar`; pinjaman/return rows are not directly editable, and a row with outgoing stock cannot be deleted.
- Non-pinjaman stock creation calls `repositories/produkmasuk-jurnal.cjs:createPurchaseJournal`. It creates a balanced purchase journal and links it to the entry in `produkmasuk_pembayaran`. A Lunas purchase credits cash/bank; a Hutang purchase credits a payable account.
- `/api/v2/produkmasuk-pembayaran` is the authenticated payment-history resource. Its repository is `src/modules/produkmasuk-pembayaran/produkmasuk-pembayaran.repository.js`: `GET ?id_produkmasuk=...` returns entry/payment overview, `POST` records a repayment, `PATCH/:id` edits a repayment or the initial Lunas cash portion (`kind: "purchase"`), and `DELETE/:id` removes a repayment.
- A repayment journal debits the purchase's payable COA and credits a cash/bank COA; it updates `produkmasuk.terbayar` in the same transaction. Cash/bank accounts must be active members of `Metode Bayar` and must not be Hutang/current liabilities. Reducing an initial Lunas cash amount reclassifies the remainder to the system-seeded Hutang COA; stock-entry fields remain unchanged.
- For journals in the current month, allowed edits/deletes update or remove the linked journal lines. For earlier periods, preserve the historical journals and create a linked correcting journal. Deleting an older stock entry reverses all linked purchase/repayment effects before removing its stock row.
- Preserve the exact journal descriptions used to associate rows (`Pembelian stok masuk #<id>`, `Pembayaran stok masuk #<id>`, and `Koreksi ... #<id>`). Payment overview classification, edit eligibility, and payable lookup depend on these links/descriptions.

## Routes and authentication

- Preserve the existing `/api` and `/api/v2` prefixes.
- Routes registered before `verifyToken` are public; routes registered after it require JWT authentication.
- Keep public and protected route ordering intentional.
- Reuse the existing authentication and error middleware.

## Code organization

- Controllers handle HTTP input, validation, and response flow.
- Services contain business rules and orchestration.
- Models contain database access.
- Reuse existing validation, query, response, and transaction helpers before creating new helpers.
- Match existing response formats and naming conventions.

## Security and validation

- Never log passwords, JWTs, cookies, or sensitive request bodies.
- Validate IDs, dates, enum values, pagination, and required fields.
- Validate upload filenames, extensions, MIME types, and destinations.
- Keep secrets in environment variables.

## Verification

- Run the relevant migration or API checks after changes.
- Verify both successful and failure paths for changed endpoints.
- Preserve compatibility with the existing legacy API unless the change explicitly requires otherwise.
