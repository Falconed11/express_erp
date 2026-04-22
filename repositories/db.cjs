const mysql = require("mysql2");
require("dotenv").config();

// Use a pool so startup does not depend on establishing one eager socket.
// Existing repositories can keep using `query(...)` without code changes.
const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

connection.on("error", (error) => {
  console.error("MySQL pool error:", error.message);
});

module.exports = connection;
