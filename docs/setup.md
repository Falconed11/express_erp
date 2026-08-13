# Setup Guide

## Prerequisites

- Node.js
- npm
- MySQL database accessible from this server

## Installation

From the project root:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root.

Recommended starting values:

```env
PORT=3001
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_DATABASE=erp
MAIN_URL=http://localhost:3001/
SALT_ROUNDS=10
```

Notes:

- the current code reads `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_DATABASE`
- the server reads `process.env.PORT` and will fall back to `3001` if not provided
- `MAIN_URL` and `SALT_ROUNDS` exist in the sample environment, but their usage should be confirmed per feature

Available npm scripts (see `package.json`):

```bash
npm run test      # placeholder test script
npm run knex      # run knex CLI using the local .env
npm run latest    # run knex migrate:latest
npm run rollback  # run knex migrate:rollback
npm run knex-run  # helper wrapper for knex-run.js
```

Tip: `nodemon` is already a dependency; to run in watch mode you can use `npx nodemon app.js` or add an `npm run dev` script.

## Running The Server

Start the API with:

```bash
node app.js
```

Expected default URL:

```text
http://localhost:3001
```

Basic health check:

```bash
curl http://localhost:3001/
```

Expected response:

```text
Hello World!
```

## Static And Upload Directories

The app uses local directories for files:

- `logo/`
- `nota/`

Make sure these directories exist and are writable in the runtime environment.

`logo/` is also served publicly at:

```text
/logo/<filename>
```

## Development Notes

- There is no `start` or `dev` script in `package.json` yet
- There is no working automated test command yet
- The server uses ESM modules because `package.json` contains `"type": "module"`

## Suggested Next Improvements

- move the server port to `process.env.PORT`
- add an `.env.example` file instead of storing sample values inside `.env`
- add a lightweight health-check endpoint for database connectivity
