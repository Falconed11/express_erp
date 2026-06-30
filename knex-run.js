// Run with: node knex-run.js

import knex from "knex";
import knexConfig from "./knexfile.js";

// Change "development" if you want another environment
const db = knex(knexConfig.development);

async function runKnex() {
  try {
    console.log("Running...");

    // =====================================================
    // EDIT ONLY THIS SECTION
    // =====================================================

    const [result] = await db.raw("SHOW CREATE TABLE jurnal_form;");
    const [result2] = await db.raw("SHOW CREATE TABLE jurnal_form_expression;");

    // MySQL returns an array where the first element contains the rows

    // console.log(result[0]["Create Table"]);
    // console.log(result2[0]["Create Table"]);

    await db.schema.dropTableIfExists("jurnal_form_expression");
    await db.schema.dropTableIfExists("jurnal_expression");
    await db.schema.dropTableIfExists("jurnal_form");

    // Examples:
    // await db.schema.createTable(...);
    // await db("users").insert(...);
    // await db.raw("ALTER TABLE ...");

    // =====================================================

    console.log("✅ Completed successfully.");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
    console.log("🔌 Database connection closed.");
  }
}

runKnex();
