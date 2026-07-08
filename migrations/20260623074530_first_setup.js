import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function up(knex) {
  // const sqlPath = path.join(__dirname, "sql", "prod.sql");
  // const sql = await fs.readFile(sqlPath, "utf8");
  // await knex.raw(sql);
}

export async function down(knex) {
  // optional rollback
}
