// transaction.js
const pool = require("./dbpromise");

async function test({ id }) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute("select * from produk", []);
    const final = result.slice(0, 9);
    return final;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
}

async function testTransaction() {
  const connection = await pool.getConnection();

  try {
    // Start the transaction
    await connection.beginTransaction();

    // First query: Insert
    const [result1] = await connection.execute(
      "INSERT INTO your_table (column1, column2) VALUES (?, ?)",
      ["value1", "value2"]
    );

    // Second query: Update
    const [result2] = await connection.execute(
      "UPDATE your_table SET column1 = ? WHERE id = ?",
      ["new_value", result1.insertId]
    );

    // Third query: Delete
    const [result3] = await connection.execute(
      "DELETE FROM your_table WHERE id = ?",
      [result1.insertId]
    );

    // Fourth query: Select
    const [result4] = await connection.execute(
      "SELECT * FROM your_table WHERE column2 = ?",
      ["value2"]
    );

    // If no errors, commit the transaction
    await connection.commit();
    console.log("Transaction committed successfully.");

    return {
      insertResult: result1,
      updateResult: result2,
      deleteResult: result3,
      selectResult: result4,
    };
  } catch (error) {
    // If any error occurs, rollback the transaction
    await connection.rollback();
    console.error("Transaction rolled back due to error:", error);

    throw error;
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
}

// module.exports = runTransaction;
module.exports = { test, testTransaction };
