import connection from "./connection.js";

export const development = {
  client: "mysql2",
  connection: {
    ...connection,
    multipleStatements: true,
  },
  migrations: {
    directory: "./migrations",
    stub: "./migration.stub",
  },
};

export default {
  development,
};
