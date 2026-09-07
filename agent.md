This is the Express ERP backend.

Follow existing patterns and keep changes minimal.

## Architecture

- `app.js` is the application entry point. Use it for middleware and route registration.
- Legacy CRUD exists in `repositories/*.cjs` and older handlers in `app.js`.
- New code belongs under `src/`.
- `src/modules` is the latest preferred CRUD structure. Prefer it for new resources.
- Use `src/modules/default` for simple standard CRUD.
- Use a more specialized module under `src/modules` when the resource has custom business logic.
- Use the older `src/routes`, `src/controllers`, `src/services`, and `src/models` structure only when extending an existing resource that already follows it.
- Do not add new business logic directly to `app.js` unless it is route registration or application middleware.

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
