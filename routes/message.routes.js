const express = require("express");
const pool = require('../config/db'); // PostgreSQL connection
const router = express.Router();

// POST /api/messages
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Use SQL INSERT for PostgreSQL
    const result = await pool.query(
      "INSERT INTO messages (name, email, message) VALUES ($1, $2, $3) RETURNING *",
      [name, email, message]
    );

    res.status(201).json({
      message: "Message sent!",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Database Error:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;