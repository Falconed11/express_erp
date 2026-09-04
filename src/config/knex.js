import knex from "knex";
import connection from "../../connection.js";

const db = knex({
  client: "mysql2",
  connection,
});

export default db;
