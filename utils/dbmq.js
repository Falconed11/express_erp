const mysql = require("mysql2");

const connection2 = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "erp",
  multipleStatements: true,
});

module.exports = connection2;
