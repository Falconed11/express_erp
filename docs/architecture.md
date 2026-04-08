# Architecture Overview

## Summary

This project is a single Express application that exposes ERP-related APIs backed by MySQL.

There are two implementation styles living side by side:

- Legacy route handlers defined directly in `app.js`
- Newer v2 resources organized into route, controller, service, and model layers under `src/`

## Runtime Flow

The request flow is:

1. `app.js` creates the Express app
2. Global middleware is applied:
   `cors`, JSON/body parsing, URL-encoded parsing, request logging, static logo serving
3. Requests are routed either to:
   legacy handlers in `app.js`, or modular v2 routers in `src/routes` and `src/modules`
4. v2 controllers call services
5. Services call models or repository-style data access code
6. Database operations use the MySQL pool from [src/config/db.js](/d:/project/express_erp/src/config/db.js)
7. Errors fall through to [src/middlewares/error.middleware.js](/d:/project/express_erp/src/middlewares/error.middleware.js)

## Main Layers

### 1. Application Entry

[app.js](/d:/project/express_erp/app.js) is the current application entry point and still contains a large amount of active business routing logic.

Responsibilities include:

- creating the Express server
- configuring middleware
- configuring file uploads
- registering v2 routers
- defining legacy `/api/*` endpoints
- registering the global error middleware
- starting the HTTP server on port `3001`

### 2. Database Layer

[src/config/db.js](/d:/project/express_erp/src/config/db.js) creates a shared MySQL connection pool using:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_DATABASE`

This pool is the main entry point for database access in the newer code.

### 3. Legacy Repository Layer

The [repositories](/d:/project/express_erp/repositories) directory contains many `.cjs` modules used directly by `app.js`.

Typical pattern:

- route is declared in `app.js`
- route calls repository method such as `list`, `create`, `update`, or `destroy`
- response is formatted inline in the route handler

This layer appears to represent the original implementation style.

### 4. v2 Modular Layer

The newer code under [src](/d:/project/express_erp/src) follows a more structured layout.

Typical v2 path:

- route file receives the request
- controller validates request input and translates HTTP concerns
- service contains business logic
- model performs data access

Examples:

- [src/routes/proyek.routes.js](/d:/project/express_erp/src/routes/proyek.routes.js)
- [src/controllers/proyek.controller.js](/d:/project/express_erp/src/controllers/proyek.controller.js)
- [src/services/proyek.service.js](/d:/project/express_erp/src/services/proyek.service.js)
- [src/models/proyek.model.js](/d:/project/express_erp/src/models/proyek.model.js)

## Reusable CRUD Pattern

Some v2 modules use a shared CRUD generator from:

- [src/modules/default/default.route.js](/d:/project/express_erp/src/modules/default/default.route.js)
- [src/modules/default/default.controller.js](/d:/project/express_erp/src/modules/default/default.controller.js)

This pattern provides standard endpoints:

- `GET /`
- `POST /`
- `GET /:id`
- `PATCH /:id`
- `DELETE /:id`

The COA modules are examples of this reusable approach.

## API Segments

### Legacy `/api/*`

The legacy API covers many ERP domains, including:

- master data such as bank, vendor, customer, user, peran
- project operations such as proyek, subproyek, keranjangproyek, pembayaranproyek, pengeluaranproyek
- inventory flows such as produk, stok, produkmasuk, produkkeluar
- reporting and summary endpoints such as omset and total calculations

### New `/api/v2/*`

The v2 API currently covers:

- COA, COA subtype, COA type
- perusahaan
- proyek
- pembayaran proyek
- pengeluaran proyek
- operasional kantor
- metode pembayaran
- transfer bank
- jenis and golongan instansi
- jenis proyek
- keranjang proyek

## File Uploads And Static Assets

`app.js` configures disk storage with Multer:

- `logo/` is used for logo uploads and is exposed through `/logo`
- `nota/` is configured as a destination for another upload flow

If this project is deployed to a fresh environment, those directories should exist and be writable.

## Error Handling

The global error middleware returns:

- `404` when the message is exactly `User not found`
- `500` for all other thrown errors

That means error responses are centralized, but status code mapping is still minimal and could be improved later.

## Current Technical Observations

- `PORT` is present in environment examples, but `app.js` currently uses a hardcoded port
- legacy and v2 APIs overlap conceptually for some resources such as `proyek` and `perusahaan`
- there is no automated test suite configured yet
- `app.js` is still very large, which makes it a likely future refactor target
