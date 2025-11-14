// db.js
const mysql = require("mysql2");

// MySQL database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "yourpassword", // Replace with your actual MySQL password
  database: "CS 401 PROJECT", // Ensure your database name is correct
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
  console.log("Connected to MySQL database");
});

module.exports = db;