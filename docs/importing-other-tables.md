# Implementing an Excel Import for Another Table

Use this playbook whenever adding an Excel import. The Produk import is the reference. Do not add new import logic to `repositories/alat.3.0.0.cjs`; new imports belong in `src/modules` and must reuse the staged engine.

## Required discovery

Before coding, read both repositories' `agent.md`, inspect the entity's schema and CRUD module, identify its create/update permission, choose its matching key, list dependencies and related records, and agree on duplicate-row behavior. Default behavior is to reject duplicate matching keys in one file.

The frontend must never decide whether a record is created or updated. Excel files must be parsed on the backend, not converted to trusted client JSON.

## Architecture

```text
XLSX upload -> entity controller -> import engine -> entity definition
                                        |              |- normalize
                                        |              |- validate
                                        |              |- preview/dependencies
                                        |              `- transactional commit
                                        -> frontend preview -> user confirmation
```

`src/modules/imports/import-engine.js` owns ExcelJS parsing, required-column checks, staged-job IDs/state, job expiry, and commit state transitions. Entity definitions own business rules.

Jobs currently reside in memory and expire after 30 minutes. If jobs must survive restarts or work with multiple backend instances, add a migration and persistent job model before implementing the importer.

## Files to add

For a `vendor` importer, follow this structure:

```text
express_erp/src/modules/vendor/vendor-import.definition.js
express_erp/src/modules/vendor/vendor-import.controller.js
express_erp/src/modules/vendor/vendor.routes.js
next_erp/components/vendor/VendorImportModal.jsx
next_erp/app/(default)/vendor/ui.jsx
```

Extend an existing module rather than creating a parallel route tree.

## Definition contract

Use `src/modules/produk/produk-import.definition.js` as the concrete example.

```js
export const vendorImportDefinition = {
  type: "vendors",
  columns: ["nama", "alamat"],
  normalize(values) {
    return { nama: normalizeText(values.nama), alamat: normalizeText(values.alamat) };
  },
  validate(rows, context) {
    // Return [{ row, field, code, message }].
  },
  async preview(rows, errors, context) {
    // Batch-load matching records/dependencies and return summary + row statuses.
  },
  async commit(job, actor) {
    // Use db.transaction(async (trx) => { ... }); for every write.
  },
};
```

Rules:

- Normalize text with `normalizeText`: trim and collapse whitespace.
- Explicitly parse and validate numeric/date values.
- Use `createImportError(row, field, code, message)` for all validation errors.
- Load matching records and dependencies with batch `whereIn` queries, chunked when necessary.
- Resolve each unique dependency once, then build an in-memory `name -> id` map.
- Use only the supplied `trx` connection for every commit write. Never interpolate spreadsheet values into SQL.
- Re-check mutable database state inside the commit transaction.

## API contract

Register static routes before a dynamic `/:id` route:

```text
POST /api/v2/<entity>/imports                 upload and stage preview
GET  /api/v2/<entity>/imports/sample          sample XLSX
GET  /api/v2/<entity>/imports/:importId       job + preview
GET  /api/v2/<entity>/imports/:importId/preview
GET  /api/v2/<entity>/imports/:importId/errors
POST /api/v2/<entity>/imports/:importId/commit
```

Use Multer memory storage with a file-size limit and allow only `.xlsx`. Apply the same authorization as entity create/update. Send non-spreadsheet context values (date, selected vendor, import mode) as multipart fields and retain them in the staged job.

The upload endpoint must not write business data. It returns preview data only. Commit must fail whenever any validation error exists, unless partial imports are explicitly approved.

## Preview and commit requirements

Preview must return total/valid/invalid rows, create/update counts, new dependency counts, each row's `CREATE`/`UPDATE`/`ERROR` status, and row/field errors.

Commit order:

```text
BEGIN -> resolve/create dependencies -> insert new records -> update matches
      -> create related records -> COMMIT
```

Any exception must roll back every dependency, main record, and related record. Use batch inserts where practical; do not run dependency lookups per row.

Generate the sample workbook server-side with ExcelJS. Include exactly the supported columns and realistic examples; omit application-supplied IDs and context fields.

## Frontend requirements

Base the modal on `next_erp/components/produk/ProdukImportModal.jsx`.

- Send the file as `FormData`; do not parse it in the browser.
- Reuse existing selectors for context values.
- Link to the sample endpoint.
- Render the backend preview and every row error.
- Disable confirmation when errors exist.
- Commit using only `importId`.
- Revalidate affected SWR queries after completion.
- Include loading, failure, cancel, and complete states.

Put reusable endpoint/mutation code in `services/` if the entity already uses that pattern.

## Tests and handoff checklist

Test normalization, numeric/date validation, required fields, duplicate matching keys, create/update matching, dependency reuse/creation, related-record values, and forced transaction rollback.

Before handoff, run `node --test <definition-test-file>`, ask before running frontend lint as required by `next_erp/agent.md`, manually test preview/commit/rollback, and report routes, matching key, dependency order, storage limitation, and test results.
