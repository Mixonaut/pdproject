// db.js - Database connection handler
const mysql = require("mysql2/promise");

// Create a connection pool for better performance
const pool = mysql.createPool({
  host: "132.145.18.222",
  user: "nm2064",
  password: "wnd2VKSANY7",
  database: "nm2064",
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0,
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Database connection successful!");
    connection.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Execute database queries
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
}

module.exports = {
  pool,
  query,
  testConnection,
};
