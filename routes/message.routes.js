const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// =======================
// SEND MESSAGE (PUBLIC)
// =======================
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await pool.query(
      `INSERT INTO messages (name, email, message, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [name, email, message]
    );

    res.status(201).json({
      message: "Message sent successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// =======================
// GET ALL MESSAGES
// =======================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
