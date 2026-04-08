# Express ERP Backend

Backend API server for an ERP application built with Express and MySQL.

This project currently contains two API styles in the same server:

- Legacy endpoints mounted directly in `app.js` under `/api/*`
- Newer modular endpoints mounted under `/api/v2/*`

The quick documentation in this repository is intended to help developers start the project, understand the folder layout, and find the main extension points.

## Tech Stack

- Node.js
- Express
- MySQL (`mysql2/promise`)
- Multer for file upload handling
- CORS and dotenv

## Project Structure

```text
.
|- app.js                  # Main Express server and legacy route definitions
|- src/
|  |- config/              # Database connection pool
|  |- controllers/         # v2 HTTP controllers
|  |- middlewares/         # Shared Express middleware
|  |- models/              # Data-access models for v2 resources
|  |- modules/             # Reusable v2 module pattern (for example COA)
|  |- routes/              # v2 route definitions
|  |- services/            # Business logic layer for v2 resources
|  |- utils/               # Shared utility helpers
|- repositories/          # Legacy CommonJS data modules used by app.js
|- helpers/               # Shared helper utilities
|- logo/                  # Uploaded/static logo files
```

## How To Run

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with the required database settings:

```env
PORT=3001
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_DATABASE=erp
MAIN_URL=http://localhost:3001/
SALT_ROUNDS=10
```

3. Start the server:

```bash
node app.js
```

The application currently hardcodes `const port = 3001` inside `app.js`, so `PORT` is documented for future compatibility but is not the active runtime source today.

## Main Endpoints

### Root

- `GET /` returns `Hello World!`
- `GET /logo/<filename>` serves files from the `logo/` directory

### v2 API

The newer API is mounted with modular route files under `/api/v2`:

- `/api/v2/coa`
- `/api/v2/coa-subtype`
- `/api/v2/coa-type`
- `/api/v2/golongan-instansi`
- `/api/v2/jenis-instansi`
- `/api/v2/jenis-proyek`
- `/api/v2/keranjang-proyek`
- `/api/v2/metode-pembayaran`
- `/api/v2/operasional-kantor`
- `/api/v2/pembayaran-proyek`
- `/api/v2/pengeluaran-proyek`
- `/api/v2/perusahaan`
- `/api/v2/proyek`
- `/api/v2/transfer-bank`

### Legacy API

The legacy API is still active in `app.js` under `/api/*` and includes many ERP resources such as:

- bank
- customer
- karyawan
- kategori proyek
- keranjang proyek
- kwitansi
- metode pembayaran
- nota
- perusahaan
- pembayaran proyek
- pengeluaran proyek
- produk and stok
- proyek
- vendor
- user and login

For the full list, see [app.js](/d:/project/express_erp/app.js).

## Documentation

- [Architecture](/d:/project/express_erp/docs/architecture.md)
- [Setup Guide](/d:/project/express_erp/docs/setup.md)

## Current Notes

- The codebase mixes ESM (`src/`) and legacy CommonJS repository files (`repositories/`)
- File uploads are configured for `logo/` and a `nota/` directory path in `app.js`
- There is no real automated test suite configured yet; `npm test` is only a placeholder
