# Express ERP (Backend)

Express-based backend API for the internal ERP system. The codebase contains both legacy endpoints (mounted directly in `app.js`) and a newer modular `v2` API under `/api/v2`.

## Tech Stack

- Node.js
- Express
- MySQL / MariaDB (`mysql2/promise`)
- Multer (file uploads)
- CORS, dotenv

## Quickstart

Prerequisites: Node.js, npm, and a MySQL-compatible database.

Install dependencies:

```bash
npm install
```

Create a `.env` in the project root. Example values:

```env
PORT=3001
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_DATABASE=erp
MAIN_URL=http://localhost:3001/
SALT_ROUNDS=10
```

Start the server locally:

```bash
node app.js
```

Or run with Docker Compose (recommended for local development):

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

The Compose file in this repo exposes the server at `http://localhost:3002` on the host by default and runs a MariaDB service.

## Project Layout (short)

`app.js` (legacy routes)
`src/` (v2 controllers, models, routes)
`repositories/` (legacy CommonJS data modules)
`helpers/`, `migrations/`, `logo/`

## Main Endpoints

- `GET /` — health/root (returns Hello World)
- `GET /logo/<filename>` — serves files from `logo/`
- `v2` modular API under `/api/v2/*` (see route files in `src/routes`)

For legacy route listings see `app.js`.

## Docs

- [Architecture](docs/architecture.md)
- [Setup Guide](docs/setup.md)

## Suggested Next Tasks

- Add an `.env.example` file and a small database health-check endpoint.
- Consider adding an `npm run dev` script (e.g., `nodemon app.js`) for developer convenience.

Note: `app.js` already respects `process.env.PORT` and falls back to `3001` if unset. `package.json` contains several knex-related scripts (migrations) and `nodemon` is listed as a dependency for development use.
